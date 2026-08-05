import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel panel-ruled mx-auto max-w-lg px-6 py-14 text-center">
      <p className="eyebrow">Nothing here</p>
      <h1 className="mt-2 font-display text-4xl tracking-wide text-chalk">
        That trade is not on the board
      </h1>
      <p className="mt-2 text-[13.5px] text-muted">
        It may have been deleted, or the link is wrong. Try searching by VIN instead.
      </p>
      <Link href="/" className="btn btn-gold mt-6">
        Back to the board
      </Link>
    </div>
  );
}
