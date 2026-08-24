import { Link } from "@/i18n/navigation";
import { ProjectThumb } from "@/components/project-thumb";
import { TreeModalButton } from "@/components/tree-modal";
import { PixelCrown } from "@/components/pixel-crown";
import { ExternalLinkDialog } from "@/components/leaderboard/external-link-dialog";
import { MEDAL, bustedImageSrc, projectHostname } from "@/lib/leaderboard-format";

/**
 * One player on the rolling board.
 *
 * ── Why a card and not a table row ──────────────────────────────────────────
 * The lifetime board is a table because it answers one question — who is ahead.
 * This board exists to make the projects visible, and a table cannot: the widest
 * thing a row can hold before it starts scrolling sideways on a phone is a
 * number, so on the lifetime board a project lives behind a 20px disclosure
 * triangle. Nobody opens a triangle. A card has room to simply show the thing.
 *
 * The two boards therefore look deliberately different. That is the point, not
 * an inconsistency to be tidied up later.
 *
 * ── Why the card visibly changes size when a project is present ─────────────
 * A filled-in project earns a thumbnail, a headline, a description and a link;
 * an empty one gets a single quiet line. The asymmetry is the whole mechanism —
 * a player scrolling past can see what filling it in would get them, without
 * being told. Flattening the two variants to equal height would remove the only
 * argument this page makes.
 */

export type ShowcaseCardProps = {
  rank: number;
  username: string;
  /** Board row id — the key this player's own page is addressed by. */
  profileId: string;
  region: { flag: string; name: string } | null;
  /** Tokens collected in the window — what this board ranks on. */
  recentLabel: string;
  /** Lifetime total, shown as secondary context. */
  totalLabel: string;
  trees: React.ComponentProps<typeof TreeModalButton>["trees"];
  project: {
    name: string;
    desc: string | null;
    url: string | null;
    image: string | null;
    /** Cache-buster input; the image URL is stable per user so it needs one. */
    updatedAt: string;
  } | null;
  /**
   * Render the "this slot is empty" prompt on a project-less card. Passed in
   * rather than derived, because it is only true near the top of the board: the
   * prompt claims the slot carries exposure, and that claim is only honest where
   * the exposure exists. Further down it would be advertising nothing.
   */
  showEmptyPrompt: boolean;
  labels: {
    treeViewAria: string;
    treeModalClose: string;
    treeModalMain: string;
    treeModalTotal: string;
    treeModalPrev: string;
    treeModalNext: string;
    tokensUnit: string;
    recentLabel: string;
    totalLabel: string;
    projectLinkLabel: string;
    projectLeaveTitle: string;
    projectLeaveBody: string;
    projectLeaveConfirm: string;
    projectLeaveCancel: string;
    emptyPrompt: string;
  };
  /** Entrance stagger, capped by the caller so deep cards do not wait seconds. */
  animDelay: string;
};

const THUMB = 104;

export function ShowcaseCard({
  rank,
  username,
  profileId,
  region,
  recentLabel,
  totalLabel,
  trees,
  project,
  showEmptyPrompt,
  labels,
  animDelay,
}: ShowcaseCardProps) {
  const medal = MEDAL[rank];
  const host = project?.url ? projectHostname(project.url) : null;

  return (
    <li
      className="reveal relative rounded-[2px]"
      style={{
        border: "var(--border-pixel)",
        background: "var(--color-surface-card)",
        boxShadow: "var(--shadow-pixel)",
        animation: "row-slide-in 320ms ease both",
        animationDelay: animDelay,
        // A medal rank gets its colour as a left rail rather than tinted text:
        // at this size the number is already large, and colouring it fights the
        // gold the token figure uses.
        borderLeft: medal ? `6px solid ${medal}` : undefined,
      }}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
        {/* ── Identity column ── */}
        <div className="flex shrink-0 items-start gap-3 sm:w-[13.5rem]">
          <span
            className="shrink-0 leading-none"
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "var(--text-counter)",
              color: medal ?? "var(--color-text-muted-light)",
            }}
          >
            {rank <= 9 ? `0${rank}` : rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <TreeModalButton
                username={username}
                trees={trees}
                triggerLabel={labels.treeViewAria}
                closeLabel={labels.treeModalClose}
                tokensUnit={labels.tokensUnit}
                mainLabel={labels.treeModalMain}
                totalLabel={labels.treeModalTotal}
                totalTokensLabel={totalLabel}
                prevLabel={labels.treeModalPrev}
                nextLabel={labels.treeModalNext}
              />
              <Link
                href={`/p/${profileId}`}
                className="truncate text-text-forest underline decoration-transparent underline-offset-4 transition-colors hover:decoration-leaf-deep"
                style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)" }}
              >
                {username}
              </Link>
              {rank === 1 && (
                <span className="shrink-0" aria-hidden>
                  <PixelCrown />
                </span>
              )}
              {region && (
                <span
                  role="img"
                  aria-label={region.name}
                  title={region.name}
                  className="shrink-0 leading-none"
                  style={{ fontSize: "0.95rem" }}
                >
                  {region.flag}
                </span>
              )}
            </div>
            {/* The window figure leads and the lifetime total follows in muted
                small type: this board ranks on the first one, so it has to be the
                one the eye lands on. */}
            <div className="mt-2">
              <div
                className="text-accent-gold"
                style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
              >
                {recentLabel}
              </div>
              <div
                className="mt-0.5 text-text-muted-light"
                style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
              >
                {labels.recentLabel}
                <span className="mx-1.5 opacity-40">·</span>
                {labels.totalLabel} {totalLabel}
              </div>
            </div>
          </div>
        </div>

        {/* ── Project column ── */}
        <div className="min-w-0 flex-1">
          {project ? (
            <div className="flex gap-4">
              {project.image && (
                <ProjectThumb
                  src={bustedImageSrc(project.image, project.updatedAt)}
                  size={THUMB}
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className="text-leaf-deep"
                  style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--text-caption)" }}
                >
                  {project.name}
                </p>
                {project.desc && (
                  <p
                    className="mt-2 text-text-forest"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-small)",
                      lineHeight: 1.65,
                    }}
                  >
                    {project.desc}
                  </p>
                )}
                {project.url && host && (
                  <p
                    className="mt-2.5 text-text-muted-light"
                    style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small)" }}
                  >
                    <span className="mr-1">{labels.projectLinkLabel}</span>
                    <ExternalLinkDialog
                      href={project.url}
                      hostname={host}
                      title={labels.projectLeaveTitle}
                      body={labels.projectLeaveBody}
                      confirmLabel={labels.projectLeaveConfirm}
                      cancelLabel={labels.projectLeaveCancel}
                    />
                  </p>
                )}
              </div>
            </div>
          ) : showEmptyPrompt ? (
            <div
              className="flex h-full min-h-[3.5rem] items-center rounded-[2px] px-4 py-3"
              style={{
                border: "1px dashed var(--color-soil)",
                background: "transparent",
              }}
            >
              <p
                className="text-text-muted-light"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-small)",
                  lineHeight: 1.6,
                }}
              >
                {labels.emptyPrompt}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
