"use client";

// Unified card-style pagination based on @ss-components/pagination-10 from shadcnstudio.
// Wraps the standard shadcn Pagination primitives with the pagination-10 styling
// ("rounded-md border p-1 shadow-xs" on PaginationContent), and adds the page-window
// logic + ellipsis handling that we previously inlined in BillsPage and PcfPage.
//
// Usage:
//   <DataPagination
//     page={page}
//     pageCount={totalPages}
//     onPageChange={setPage}
//     totalItems={totalCount}    // optional, drives the "Showing X–Y of Z" label
//     pageSize={pageSize}        // optional, same
//     currentRangeCount={rows.length} // optional, same; defaults to pageSize when omitted
//   />

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type DataPaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  currentRangeCount?: number;
  pageWindow?: number;
  className?: string;
  itemLabel?: string;
};

export function DataPagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
  currentRangeCount,
  pageWindow = 5,
  className,
  itemLabel = "results",
}: DataPaginationProps) {
  const totalPages = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), totalPages);

  // Page window: page numbers around the current page.
  const halfWindow = Math.floor(pageWindow / 2);
  let windowStart = Math.max(1, safePage - halfWindow);
  let windowEnd = Math.min(totalPages, windowStart + pageWindow - 1);
  if (windowEnd - windowStart + 1 < pageWindow) {
    windowStart = Math.max(1, windowEnd - pageWindow + 1);
  }
  const visiblePages: number[] = [];
  for (let p = windowStart; p <= windowEnd; p += 1) {
    visiblePages.push(p);
  }

  // "Showing X–Y of Z" label.
  const showRangeLabel =
    typeof totalItems === "number" && typeof pageSize === "number";
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * (pageSize ?? 0) + 1;
  const endItem =
    totalItems === 0
      ? 0
      : Math.min(
          totalItems ?? 0,
          (safePage - 1) * (pageSize ?? 0) + (currentRangeCount ?? pageSize ?? 0),
        );

  const isFirstPage = safePage <= 1;
  const isLastPage = safePage >= totalPages;

  const goToPage = (target: number) => {
    if (target < 1 || target > totalPages || target === safePage) return;
    onPageChange(target);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {showRangeLabel ? (
        <div className="text-sm text-muted-foreground">
          Showing {startItem}–{endItem} of {totalItems} {itemLabel}
        </div>
      ) : (
        <div />
      )}

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent className="rounded-md border p-1 shadow-xs">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={isFirstPage}
              tabIndex={isFirstPage ? -1 : 0}
              className={cn(isFirstPage && "pointer-events-none opacity-50")}
              onClick={(event) => {
                event.preventDefault();
                if (!isFirstPage) goToPage(safePage - 1);
              }}
            />
          </PaginationItem>

          {windowStart > 1 ? (
            <>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goToPage(1);
                  }}
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {windowStart > 2 ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}
            </>
          ) : null}

          {visiblePages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === safePage}
                onClick={(event) => {
                  event.preventDefault();
                  goToPage(p);
                }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}

          {windowEnd < totalPages ? (
            <>
              {windowEnd < totalPages - 1 ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    goToPage(totalPages);
                  }}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          ) : null}

          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={isLastPage}
              tabIndex={isLastPage ? -1 : 0}
              className={cn(isLastPage && "pointer-events-none opacity-50")}
              onClick={(event) => {
                event.preventDefault();
                if (!isLastPage) goToPage(safePage + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
