import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const storeOtp = mutation({
  args: { email: v.string(), code: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    // Remove any existing OTP for this email
    const existing = await ctx.db
      .query("otps")
      .filter((q) => q.eq(q.field("email"), args.email.toLowerCase().trim()))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("otps", {
      email: args.email.toLowerCase().trim(),
      code: args.code,
      expiresAt: args.expiresAt,
      attempts: 0,
    });
  },
});

export const verifyOtp = mutation({
  args: { email: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const otp = await ctx.db
      .query("otps")
      .filter((q) => q.eq(q.field("email"), args.email.toLowerCase().trim()))
      .unique();
    if (!otp) return { success: false, reason: "not_found" };
    if (Date.now() > otp.expiresAt) {
      await ctx.db.delete(otp._id);
      return { success: false, reason: "expired" };
    }
    if (otp.attempts >= 3) {
      await ctx.db.delete(otp._id);
      return { success: false, reason: "too_many_attempts" };
    }
    if (otp.code === args.code.trim()) {
      await ctx.db.delete(otp._id);
      return { success: true };
    }
    await ctx.db.patch(otp._id, { attempts: otp.attempts + 1 });
    if (otp.attempts + 1 >= 3) await ctx.db.delete(otp._id);
    return { success: false, reason: "wrong_code" };
  },
});
