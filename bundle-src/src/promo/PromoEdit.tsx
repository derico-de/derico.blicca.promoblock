/**
 * The `edit` half: the canvas is a live preview, never an editing surface.
 *
 * Every field is edited in the sidebar (map: sidebar-only editing). The block
 * is a Plate VOID node, so in-canvas text would mean re-solving focus, undo
 * and selection inside a void — and the description is plain text by
 * decision, so there is nothing rich to edit anyway.
 *
 * NOTHING IS SEEDED. `derico-hero` writes the mockup's German copy at insert
 * time; ticket 03 Q5 ruled that out here, because a generic block has no copy
 * that is right for every site and a plausible default belonging to one site
 * is worse than an empty field. So there is no `useEffect`, no
 * `onChangeBlock`, and no ref guard — the whole seeding mechanism the ticket
 * described is moot, and its absence is the decision, not an omission.
 *
 * What the canvas adds instead is HONESTY, and it is the only reason this
 * component exists at all:
 *
 *  - the **skeleton**: nothing is seeded and ticket 17 rule 3 keeps the block
 *    root empty when there is nothing in it, so a fresh promo would otherwise
 *    be a blank box. `missing()` names the empty slots.
 *  - the **notices**: every Q8 row that discards something the author typed is
 *    announced here and nowhere else. That is what makes those silent
 *    resolutions acceptable on the public page.
 *
 * Both live OUTSIDE the block root and are `contentEditable={false}`, so they
 * can neither be typed into nor reached by the block's own scoped stylesheet
 * selectors, which all descend from `.promo`.
 */
import { missing, warnings, type PromoData } from './data';
import PromoView from './PromoView';

export type PromoEditProps = {
  data?: PromoData;
};

export function PromoEdit(props: PromoEditProps) {
  const data = props.data ?? {};
  const gaps = missing(data);
  const notes = warnings(data);
  return (
    <>
      <PromoView {...props} isEditMode />
      {gaps.length ? (
        <p className="promo-incomplete" contentEditable={false}>
          Still to fill in: {gaps.join(', ')}.
        </p>
      ) : null}
      {notes.map((note) => (
        <p key={note} className="promo-notice" contentEditable={false}>
          {note}
        </p>
      ))}
    </>
  );
}

export default PromoEdit;
