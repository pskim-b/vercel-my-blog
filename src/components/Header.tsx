import Link from "next/link";
import Image from "next/image";

export default function Header() {
    return (
      <header className="text-left py-4 px-4 border-b border-gray-700 mt-8">
        <div className="flex items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/images/logo3_theengineerof.png" 
              alt="The Engineer of Logo" 
              width={240}
              height={80}
              className="object-contain"
            />
          </Link>
        </div>
      </header>
    );
  }