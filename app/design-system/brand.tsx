import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="LLM Arena home">
      <Image
        className="brand-logo"
        src="/llmarena-logo.png"
        alt="LLM Arena"
        width={512}
        height={271}
        sizes="84px"
        loading="eager"
      />
    </Link>
  );
}
