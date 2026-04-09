import JackpotNavigation from "@/components/jackpot-prizes/Navigation";

export default function JackpotPrizesMainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JackpotNavigation />
      {children}
    </>
  );
}
