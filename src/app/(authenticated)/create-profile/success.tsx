export default function ProfileSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4 text-foreground">
        Profile Submitted!
      </h1>
      <p className="text-lg text-muted-foreground mb-6">
        Thank you for creating your profile. Your submission is now{" "}
        <span className="font-semibold text-[#BFA67A]">
          awaiting admin approval
        </span>
        .<br />
        You will be notified once your profile is reviewed and approved.
      </p>
    </div>
  );
}
