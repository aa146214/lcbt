import { useCallback, useMemo, useState } from "react";
import type { Answers, Course, InterestId, MatchResult, StepKey } from "./content/types";
import { getMatches, getSteps, pruneAnswers, vibeCardCount } from "./lib/matching";
import {
  setProfile,
  setTotalQuestions,
  trackQuizComplete,
  trackQuizStart,
} from "./lib/analytics";
import { ProfileStrip, ProgressBar, TopBar } from "./components/Chrome";
import { Landing } from "./screens/Landing";
import { VibeDeck } from "./screens/VibeDeck";
import { Quiz } from "./screens/Quiz";
import { Calculating } from "./screens/Calculating";
import { Results } from "./screens/Results";
import { EmailCapture } from "./screens/EmailCapture";
import { Confirmation } from "./screens/Confirmation";

type Screen =
  | "landing"
  | "vibe"
  | "quiz"
  | "calculating"
  | "results"
  | "email"
  | "confirmation";

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [saved, setSaved] = useState<Course[]>([]);

  const steps = useMemo(() => getSteps(answers), [answers]);

  // Recomputed only once the flow reaches the reveal, so a mid-quiz answer
  // change can't leave a stale match on screen.
  const matches: MatchResult | null = useMemo(
    () =>
      screen === "calculating" || screen === "results" || screen === "email" || screen === "confirmation"
        ? getMatches(answers)
        : null,
    [screen, answers],
  );

  const start = useCallback(() => {
    trackQuizStart();
    setScreen("vibe");
  }, []);

  const restart = useCallback(() => {
    setAnswers({});
    setStepIndex(0);
    setSaved([]);
    setProfile({ course: "unknown", age_range: "unknown" });
    setScreen("landing");
  }, []);

  const onVibeComplete = useCallback((interest: InterestId) => {
    setAnswers((prev) => ({ ...prev, interest }));
    setProfile({ course: interest });
    setStepIndex(0);
    setScreen("quiz");
  }, []);

  const onAnswer = useCallback(
    (step: StepKey, value: string) => {
      const next = pruneAnswers({ ...answers, [step]: value } as Answers);
      setAnswers(next);
      if (step === "age") setProfile({ age_range: value });

      const nextSteps = getSteps(next);
      // The step list can grow (19+ unlocks two more) or shrink (16-18 closes
      // them), so recompute the position rather than trusting stepIndex + 1.
      const currentPos = nextSteps.indexOf(step);
      if (currentPos > -1 && currentPos + 1 < nextSteps.length) {
        setStepIndex(currentPos + 1);
      } else {
        setTotalQuestions(vibeCardCount + nextSteps.length);
        setScreen("calculating");
      }
    },
    [answers],
  );

  const goBack = useCallback(() => {
    if (stepIndex === 0) {
      setScreen("vibe");
      return;
    }
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  return (
    <main className="app-shell">
      {screen === "landing" && <Landing onStart={start} />}

      {screen === "vibe" && (
        <>
          <TopBar onBack={() => setScreen("landing")} />
          <VibeDeck onComplete={onVibeComplete} />
        </>
      )}

      {screen === "quiz" && steps[stepIndex] && (
        <>
          <TopBar onBack={goBack} />
          <ProgressBar total={steps.length} current={stepIndex} />
          <ProfileStrip answers={answers} steps={steps} />
          <Quiz
            /* Remounting per question resets the tap-confirm state without an
               effect writing state on every question change. */
            key={steps[stepIndex]}
            answers={answers}
            stepKey={steps[stepIndex]}
            stepIndex={stepIndex}
            totalSteps={steps.length}
            onAnswer={onAnswer}
          />
        </>
      )}

      {screen === "calculating" && (
        <Calculating
          onDone={() => {
            // Fired here rather than on the results screen, because a
            // register-interest run never reaches one — measuring completion
            // there would drop that whole segment out of the funnel.
            if (matches) trackQuizComplete(matches.courses.map((c) => c.id));

            // Nothing to match them with: skip the deck entirely rather than
            // making someone swipe a single card that isn't a course.
            setScreen(matches?.type === "registerInterest" ? "email" : "results");
          }}
        />
      )}

      {screen === "results" && matches && (
        <>
          <TopBar />
          <Results
            matches={matches}
            answers={answers}
            onFinish={(list) => {
              setSaved(list);
              setScreen("email");
            }}
          />
        </>
      )}

      {screen === "email" && matches && (
        <>
          <TopBar
            onBack={() => {
              // There is no deck behind this one on the register-interest
              // path, so back goes to the question that sent them here.
              if (matches.type === "registerInterest") {
                setStepIndex(Math.max(0, steps.length - 1));
                setScreen("quiz");
              } else {
                setScreen("results");
              }
            }}
          />
          <EmailCapture
            saved={saved}
            matched={matches.courses}
            answers={answers}
            registerInterest={matches.type === "registerInterest"}
            onDone={() => setScreen("confirmation")}
          />
        </>
      )}

      {screen === "confirmation" && matches && (
        <Confirmation
          saved={saved}
          matched={matches.courses}
          registerInterest={matches.type === "registerInterest"}
          onRestart={restart}
        />
      )}
    </main>
  );
}
