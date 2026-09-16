import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * The swipe directions, as two labelled controls rather than a sentence.
 *
 * A grey line of prose under the headline was being skipped — people reached
 * the deck without knowing which way meant what. These sit directly above the
 * card, and each one is coloured to match the button it describes: the muted
 * one pairs with the X, the pink one with the heart.
 */
export function SwipeHint({
  left,
  leftSub,
  right,
  rightSub,
}: {
  left: string;
  leftSub: string;
  right: string;
  rightSub: string;
}) {
  return (
    <div className="swipe-hint">
      <span className="swipe-hint__item swipe-hint__item--left">
        <ArrowLeft size={16} />
        <span>
          <span className="swipe-hint__label">{left}</span>
          <span className="swipe-hint__sub">{leftSub}</span>
        </span>
      </span>
      <span className="swipe-hint__item swipe-hint__item--right">
        <span>
          <span className="swipe-hint__label">{right}</span>
          <span className="swipe-hint__sub">{rightSub}</span>
        </span>
        <ArrowRight size={16} />
      </span>
    </div>
  );
}
