import { ReactNode } from "react";

interface TabContentContainerProps {
  children: ReactNode;
}

export default function TabContentContainer({ children }: TabContentContainerProps) {
  return (
    <div className="container mx-auto px-4 md:px-6 -mt-px">
      <div className="border-2 border-accent-orange-base rounded-b-2xl md:rounded-2xl bg-white overflow-hidden">
        <div className="p-3 md:p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
