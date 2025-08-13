import { Outlet, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

interface PublicOnlyProps {
  redirectTo?: string;
}

export default function PublicOnly({ redirectTo = "/calendar" }: PublicOnlyProps): JSX.Element {
  return (
    <>
      <SignedOut>
        <Outlet />
      </SignedOut>
      <SignedIn>
        <Navigate to={redirectTo} replace />
      </SignedIn>
    </>
  );
}