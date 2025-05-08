'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ExternalLink, MessageSquare } from 'lucide-react';
import { useCgLib } from '@/context/CgLibContext';
import { useToast } from "@/hooks/use-toast";

// Get URLs from environment variables with fallbacks
const HELP_CHANNEL_URL = process.env.NEXT_PUBLIC_HELP_CHANNEL_URL || 'app.cg/c/gF4j5uWriu/channel/help/';
const FEATURE_IDEAS_CHANNEL_URL = process.env.NEXT_PUBLIC_FEATURE_IDEAS_CHANNEL_URL || 'app.cg/c/gF4j5uWriu/channel/feature-ideas/';
const SUPPORT_EMAIL_URL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL_URL;
const COMMUNITY_EVENTS_URL = process.env.NEXT_PUBLIC_COMMUNITY_EVENTS_URL;

interface ContactViewProps {
  isAdmin?: boolean;
}

export const ContactView: React.FC<ContactViewProps> = ({ isAdmin }) => {
  const { cgInstance } = useCgLib();
  const { toast } = useToast();

  // Function to navigate to a Common Ground channel or other URL
  const navigateToChannel = async (url: string, channelName: string) => {
    if (!url) {
      toast({
        title: "Navigation Error",
        description: `The ${channelName} URL is not configured.`,
        variant: "destructive"
      });
      return;
    }

    if (!cgInstance) {
      console.error('Cannot navigate: CgPluginLib instance not available');
      toast({
        title: "Navigation Error",
        description: "Unable to navigate to the channel. The plugin is not fully initialized.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if URL has any protocol (not just http/https)
      const hasProtocol = /^[a-z]+:\/\/|^mailto:|^tel:/i.test(url);
      const fullUrl = hasProtocol ? url : `https://${url}`;
      console.log(`Navigating to ${channelName}:`, fullUrl);
      
      // Use the navigate function from the CG Plugin instance
      await cgInstance.navigate(fullUrl);
    } catch (error) {
      console.error(`Error navigating to ${channelName}:`, error);
      toast({
        title: "Navigation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      {/* Section title with animation */}
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Contact Support</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Get help or share your ideas with our team through these dedicated channels
        </p>
      </div>

      {/* Main content with channel cards */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Help Channel Card */}
        <Card className="overflow-hidden relative group animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-300"></div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                <span className="text-xl">⁉️</span>
              </div>
              <div>
                <CardTitle>Help Channel</CardTitle>
                <CardDescription className="mt-1">
                  Get assistance with questions or issues
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">
                Our help channel is the best place to ask questions, report issues, or get assistance with any 
                challenges you're facing. Our team and community members actively monitor this channel.
              </p>
              
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-amber-500" />
                  Expected Response Time
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  We typically respond to help requests within 24 hours during business days.
                </p>
              </div>

              <Button 
                className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                onClick={() => navigateToChannel(HELP_CHANNEL_URL, 'Help')}
              >
                <span>Open Help Channel</span>
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Ideas Channel Card */}
        <Card className="overflow-hidden relative group animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-300"></div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                <span className="text-xl">💡</span>
              </div>
              <div>
                <CardTitle>Feature Ideas</CardTitle>
                <CardDescription className="mt-1">
                  Share your suggestions and feedback
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">
                Have ideas for improving the platform or onboarding process? Our feature ideas channel is where 
                you can share suggestions, feedback, and participate in shaping the future of our community.
              </p>
              
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Community Voting
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Popular feature requests get prioritized for implementation in future updates.
                </p>
              </div>

              <Button 
                className="w-full mt-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                onClick={() => navigateToChannel(FEATURE_IDEAS_CHANNEL_URL, 'Feature Ideas')}
              >
                <span>Open Feature Ideas Channel</span>
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Support Information */}
      <div className="mt-12 w-full max-w-5xl mx-auto">
        <Card className="animate-in fade-in slide-in-from-bottom-5 duration-500 delay-450">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Additional Ways to Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Besides our dedicated channels, you can also reach out through these methods:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUPPORT_EMAIL_URL && (
                <div 
                  onClick={() => navigateToChannel(SUPPORT_EMAIL_URL, 'Email Support')}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Email Support</h3>
                    <p className="text-xs text-muted-foreground mt-1">For private inquiries or sensitive issues</p>
                  </div>
                </div>
              )}
              
              {COMMUNITY_EVENTS_URL && (
                <div 
                  onClick={() => navigateToChannel(COMMUNITY_EVENTS_URL, 'Community Events')}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                      <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Community Events</h3>
                    <p className="text-xs text-muted-foreground mt-1">Join our regular town halls and community calls</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}; 