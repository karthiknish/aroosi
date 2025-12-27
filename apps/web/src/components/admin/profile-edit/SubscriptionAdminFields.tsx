"use client";

import React from "react";
import { useWatch, Control, UseFormRegister, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProfileFormSchema } from "@/hooks/useProfileEditFormLogic";

interface SubscriptionExpiryPreviewProps {
  control: Control<ProfileFormSchema>;
}

function SubscriptionExpiryPreview({ control }: SubscriptionExpiryPreviewProps) {
  const raw = useWatch({ control, name: "subscriptionExpiresAt" }) as number | string | null | undefined;

  const num = raw === undefined || raw === null ? null : typeof raw === "string" ? Number(raw) : raw;
  const value = Number.isFinite(num as number) ? (num as number) : null;

  if (!value) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        No expiry set. Users on paid plans should have a future timestamp in ms.
      </p>
    );
  }

  const date = new Date(value);
  const now = Date.now();
  const diffDays = Math.ceil((value - now) / (1000 * 60 * 60 * 24));
  const isFuture = value > now;

  return (
    <div className="text-xs text-muted-foreground mt-1 space-y-1">
      <div>Formatted: {date.toLocaleString()}</div>
      <div>
        {isFuture ? `Days remaining: ${diffDays}` : `Expired ${Math.abs(diffDays)} day(s) ago`}
      </div>
      <div className="italic opacity-80">
        Spotlight badge expiry: not available for this profile
      </div>
    </div>
  );
}

interface SubscriptionAdminFieldsProps {
  register: UseFormRegister<ProfileFormSchema>;
  control: Control<ProfileFormSchema>;
}

export function SubscriptionAdminFields({ register, control }: SubscriptionAdminFieldsProps) {
  return (
    <section className="bg-neutral/5 p-6 rounded-2xl border border-neutral/10">
      <h3 className="text-lg font-bold text-neutral-dark mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        Admin & Subscription
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-neutral-dark" htmlFor="subscriptionPlan">
              Subscription Plan
            </Label>
            <select
              id="subscriptionPlan"
              {...register("subscriptionPlan")}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="premiumPlus">Premium Plus</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-3 bg-base-light rounded-xl border border-neutral/10">
            <Controller
              name="hideFromFreeUsers"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="hideFromFreeUsers"
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                  className="w-5 h-5 rounded border-neutral/30 text-primary focus:ring-primary/20"
                />
              )}
            />
            <Label htmlFor="hideFromFreeUsers" className="text-sm font-semibold text-neutral-dark cursor-pointer">
              Hide from Free Users
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-neutral-dark" htmlFor="subscriptionExpiresAt">
              Subscription Expiry (Unix ms)
            </Label>
            <Input
              id="subscriptionExpiresAt"
              type="number"
              {...register("subscriptionExpiresAt")}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-base-light text-neutral-dark"
              placeholder="Unix ms timestamp"
            />
            <SubscriptionExpiryPreview control={control} />
          </div>
        </div>
      </div>
    </section>
  );
}
