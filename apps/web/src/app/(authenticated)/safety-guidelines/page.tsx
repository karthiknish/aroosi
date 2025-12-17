"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Mail, Eye, Users, Flag } from "lucide-react";
import Link from "next/link";


export default function SafetyGuidelinesPage() {
  return (
    <>

      <div className="relative">
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-20 z-0 pointer-events-none" />
      <div className="max-w-4xl mx-auto p-6 space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-info/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-info" />
          </div>
          <h1 className="text-3xl font-serif text-neutral-dark">Safety Guidelines</h1>
          <p className="text-lg text-neutral max-w-2xl mx-auto">
            Your safety is our priority. Learn how to stay safe while using
            Aroosi and what to do if you encounter any issues.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-danger/5 border-danger/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Flag className="h-6 w-6 text-danger" />
                <div>
                  <h3 className="font-semibold text-neutral-dark">Report a User</h3>
                  <p className="text-sm text-neutral">
                    Found inappropriate behavior?
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-secondary" />
                <div>
                  <h3 className="font-semibold text-neutral-dark">
                    Manage Blocked Users
                  </h3>
                  <p className="text-sm text-neutral">
                    View and unblock users
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/blocked-users">View Blocked Users</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Safety Tips */}
        <Card className="bg-base-light">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-neutral-dark">
              <Eye className="h-5 w-5 text-success" />
              General Safety Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2 text-success">
                  Protect Your Privacy
                </h4>
                <ul className="space-y-2 text-sm text-neutral">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 bg-success rounded-full mt-2 flex-shrink-0" />
                    Don&apos;t share personal information like your address,
                    phone number, or workplace early on
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 bg-success rounded-full mt-2 flex-shrink-0" />
                    Use Aroosi&apos;s messaging system instead of giving out
                    external contact details
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 bg-success rounded-full mt-2 flex-shrink-0" />
                    Be cautious about what you share in photos (avoid showing
                    addresses, license plates)
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-success">
                  Meeting Safely
                </h4>
                <ul className="space-y-2 text-sm text-neutral">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 bg-success rounded-full mt-2 flex-shrink-0" />
                    Always meet in public places for first dates
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 bg-success rounded-full mt-2 flex-shrink-0" />
                    Tell a friend or family member where you&apos;re going and
                    when you expect to return
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 bg-success rounded-full mt-2 flex-shrink-0" />
                    Arrange your own transportation to and from the date
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning Signs */}
        <Card className="bg-base-light">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-neutral-dark">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Warning Signs to Watch For
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-neutral-dark">
                Be cautious if someone:
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="space-y-2 text-sm text-neutral">
                  <li>• Asks for money or financial information</li>
                  <li>
                    • Pushes to move conversations off the platform quickly
                  </li>
                  <li>• Refuses to video chat or meet in person</li>
                  <li>• Has very few or suspicious-looking photos</li>
                </ul>
                <ul className="space-y-2 text-sm text-neutral">
                  <li>• Professes love very quickly</li>
                  <li>• Has inconsistent stories about their life</li>
                  <li>• Pressures you to share personal information</li>
                  <li>• Makes you feel uncomfortable or pressured</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reporting Tools */}
        <Card className="bg-base-light">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-neutral-dark">
              <Flag className="h-5 w-5 text-secondary" />
              Reporting & Blocking Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2 text-secondary">
                  When to Report
                </h4>
                <ul className="space-y-1 text-sm text-neutral">
                  <li>• Inappropriate or offensive content</li>
                  <li>• Harassment or threatening behavior</li>
                  <li>• Suspected fake profiles</li>
                  <li>• Spam or commercial solicitation</li>
                  <li>• Any behavior that makes you feel unsafe</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-secondary">
                  When to Block
                </h4>
                <ul className="space-y-1 text-sm text-neutral">
                  <li>• Someone is bothering you persistently</li>
                  <li>• You don&apos;t want to interact with them</li>
                  <li>• They make you feel uncomfortable</li>
                  <li>• You want to prevent all contact</li>
                </ul>
              </div>
            </div>
            <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4">
              <p className="text-sm text-neutral">
                <strong className="text-neutral-dark">Remember:</strong> Reporting helps keep our community
                safe for everyone. Our team reviews all reports within 24-48
                hours and takes appropriate action.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="bg-base-light">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-neutral-dark">
              <Mail className="h-5 w-5 text-info" />
              Contact Our Support Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-info/5 border border-info/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-neutral-dark mb-1">
                    Need help or have concerns?
                  </h4>
                  <p className="text-sm text-neutral">
                    Our support team is here to help with any safety concerns or
                    questions about using Aroosi.
                  </p>
                </div>
                <Button asChild>
                  <Link className="text-base-light" href="/contact">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
