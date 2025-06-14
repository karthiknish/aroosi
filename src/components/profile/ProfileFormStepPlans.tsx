import React from "react";
import { useFormContext } from "react-hook-form";
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from "@/types/profile";
import { Check, Star, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileFormStepPlansProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: any; // For compatibility with other form steps
}

const ProfileFormStepPlans: React.FC<ProfileFormStepPlansProps> = ({
  form,
}) => {
  const formContext = useFormContext();
  const { register, watch, setValue } = formContext ||
    form || { register: () => {}, watch: () => {}, setValue: () => {} };
  const selectedPlan = watch("subscriptionPlan") as
    | SubscriptionPlan
    | undefined;

  // Set free plan by default if none selected
  React.useEffect(() => {
    if (!selectedPlan) {
      setValue("subscriptionPlan", "free");
    }
  }, [selectedPlan, setValue]);

  const handlePlanSelect = (planId: SubscriptionPlan) => {
    setValue("subscriptionPlan", planId);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-primary">Choose Your Plan</h2>
        <p className="text-gray-600">
          Select a subscription plan that suits your needs. You can upgrade or
          downgrade at any time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div key={plan.id} className="relative">
            <input
              type="radio"
              id={`plan-${plan.id}`}
              value={plan.id}
              checked={selectedPlan === plan.id}
              className="sr-only"
              {...register("subscriptionPlan", {
                onChange: () => handlePlanSelect(plan.id),
              })}
            />
            <div
              onClick={() => handlePlanSelect(plan.id)}
              className={cn(
                "flex flex-col h-full p-5 rounded-xl border-2 cursor-pointer",
                "transition-all duration-300 ease-in-out",
                selectedPlan === plan.id
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              {/* Badge if popular */}
              {plan.popular && (
                <div className="absolute -top-3 right-4 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" /> {plan.badge}
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-4 space-y-1">
                <div className="font-bold text-lg">{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold">
                    {plan.displayPrice}
                  </span>
                  <span className="text-sm text-gray-600">{plan.duration}</span>
                </div>
              </div>

              {/* Feature list */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <Check
                      size={18}
                      className={cn(
                        "mt-0.5",
                        plan.id === "free"
                          ? "text-gray-600"
                          : plan.id === "premium"
                            ? "text-primary"
                            : "text-amber-600"
                      )}
                    />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Selected check */}
              {selectedPlan === plan.id && (
                <div className="absolute top-3 right-3 bg-primary text-white rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}

              {/* Special indicator for Premium Plus */}
              {plan.id === "premiumPlus" && (
                <div className="absolute -top-3 -left-3">
                  <Award className="h-6 w-6 text-amber-500" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Free trial message for paid plans */}
      {selectedPlan && selectedPlan !== "free" && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
          <div className="flex gap-2 items-center">
            <div className="text-blue-700 font-medium">
              <Star className="inline h-4 w-4 mr-1" />
              Free 1-month trial included
            </div>
          </div>
          <p className="text-sm mt-1 text-blue-800">
            Try it now with no commitment. You won&apos;t be charged until your
            trial ends.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileFormStepPlans;
