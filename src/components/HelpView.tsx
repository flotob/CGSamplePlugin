'use client';

import React, { useState } from 'react';
// Shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Icons
import { BookOpen, HelpCircle, LifeBuoy, MessageCircle, Shield, Users, Zap } from 'lucide-react';

// Define props for the Help component
interface HelpViewProps {
  isAdmin: boolean;
}

// Define article structure
interface HelpArticle {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  icon: React.ElementType;
}

export const HelpView: React.FC<HelpViewProps> = ({ isAdmin }) => {
  // Define admin help articles
  const adminHelpArticles: HelpArticle[] = [
    {
      id: 'getting-started-admin',
      title: 'Getting Started as Admin',
      description: 'Learn how to administer your community onboarding process',
      icon: Shield,
      content: (
        <div className="space-y-4">
          <p>Welcome to the Onboarding Wizard admin panel! As an admin, you have special privileges to manage your community&apos;s onboarding process.</p>
          
          <h3 className="text-lg font-medium mt-6 mb-2">Key Admin Features:</h3>
          <ul className="space-y-2 list-disc pl-5">
            <li>Configure multiple onboarding paths for different types of members</li>
            <li>Customize step requirements and verification methods</li>
            <li>Manually assign roles to users</li>
            <li>View analytics on member onboarding progress</li>
          </ul>
          
          <h3 className="text-lg font-medium mt-6 mb-2">Admin Dashboard Overview</h3>
          <div className="relative rounded-lg border border-border overflow-hidden h-48 mb-2">
            <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Dashboard preview image</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">The admin dashboard gives you an overview of your community&apos;s onboarding statistics and quick access to key functions.</p>
        </div>
      )
    },
    {
      id: 'role-management',
      title: 'Role Management',
      description: 'Learn how to create and assign roles to community members',
      icon: Users,
      content: (
        <div className="space-y-4">
          <p>Roles are the core of the onboarding process. They allow you to categorize members and grant them specific permissions or access.</p>
          
          <h3 className="text-lg font-medium mt-6 mb-2">Managing Roles:</h3>
          <ul className="space-y-2 list-disc pl-5">
            <li>Create roles that represent different member types or levels in your community</li>
            <li>Set requirements for each role (actions members must complete)</li>
            <li>Configure automatic or manual verification for requirements</li>
            <li>Assign roles directly to members from the dashboard</li>
          </ul>
          
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 mt-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Pro Tip
            </h4>
            <p className="text-sm mt-2">Use role dependencies to create progression paths. For example, a &quot;Senior Member&quot; role might require a user to already have the &quot;Member&quot; role.</p>
          </div>
        </div>
      )
    },
    {
      id: 'wizard-configuration',
      title: 'Configuring the Wizard',
      description: 'How to set up onboarding paths and verification steps',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <p>The wizard configuration allows you to create guided onboarding experiences for your community members.</p>
          
          <h3 className="text-lg font-medium mt-6 mb-2">Configuration Steps:</h3>
          <ol className="space-y-4 list-decimal pl-5">
            <li>
              <strong>Create Onboarding Paths</strong>
              <p className="text-sm text-muted-foreground mt-1">Define different paths for different types of members (e.g., &quot;Developer&quot;, &quot;Designer&quot;, &quot;Community Manager&quot;)</p>
            </li>
            <li>
              <strong>Add Requirements</strong>
              <p className="text-sm text-muted-foreground mt-1">For each path, add requirements like &quot;Complete Discord verification&quot;, &quot;Join a meeting&quot;, etc.</p>
            </li>
            <li>
              <strong>Set Verification Methods</strong>
              <p className="text-sm text-muted-foreground mt-1">Choose how each requirement is verified (automatic API verification, admin verification, or self-verification)</p>
            </li>
            <li>
              <strong>Configure Rewards</strong>
              <p className="text-sm text-muted-foreground mt-1">Set what roles or privileges members receive upon completing each path</p>
            </li>
          </ol>
          
          <div className="p-4 rounded-lg border border-border mt-6">
            <h4 className="text-sm font-medium">Example Configuration</h4>
            <p className="text-sm mt-2">Path: <strong>Developer Onboarding</strong></p>
            <ul className="text-sm mt-2 space-y-2 list-disc pl-5">
              <li>Requirement: Verify GitHub account (API verification)</li>
              <li>Requirement: Join Developer Discord channel (API verification)</li>
              <li>Requirement: Introduce yourself (Admin verification)</li>
              <li>Reward: Developer role (Automatic assignment)</li>
            </ul>
          </div>
        </div>
      )
    },
  ];

  // Define user help articles
  const userHelpArticles: HelpArticle[] = [
    {
      id: 'getting-started-user',
      title: 'Getting Started',
      description: 'Learn how to use the onboarding wizard',
      icon: HelpCircle,
      content: (
        <div className="space-y-4">
          <p>Welcome to the Onboarding Wizard! This tool will guide you through the process of joining and becoming an active member of our community.</p>
          
          <h3 className="text-lg font-medium mt-6 mb-2">How It Works:</h3>
          <ol className="space-y-2 list-decimal pl-5">
            <li>Complete verification steps to confirm your identity</li>
            <li>Follow guided onboarding tasks tailored to your interests</li>
            <li>Earn roles that give you access to different parts of the community</li>
            <li>Track your progress through the onboarding process</li>
          </ol>
          
          <div className="rounded-lg border border-border overflow-hidden mt-6">
            <div className="bg-card/50 p-4 border-b border-border">
              <h4 className="font-medium">Your Onboarding Journey</h4>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">1</div>
                  <div>
                    <p className="font-medium">Verification</p>
                    <p className="text-sm text-muted-foreground">Confirm your identity</p>
                  </div>
                </div>
                <div className="ml-4 h-6 border-l border-dashed border-border"></div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">2</div>
                  <div>
                    <p className="font-medium">Onboarding Tasks</p>
                    <p className="text-sm text-muted-foreground">Complete community-specific requirements</p>
                  </div>
                </div>
                <div className="ml-4 h-6 border-l border-dashed border-border"></div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">3</div>
                  <div>
                    <p className="font-medium">Role Assignment</p>
                    <p className="text-sm text-muted-foreground">Receive your community roles</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'completing-tasks',
      title: 'Completing Tasks',
      description: 'How to complete onboarding tasks and verify your progress',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <p>The onboarding process consists of various tasks that help you become an active community member. Here&apos;s how to complete them effectively.</p>
          
          <h3 className="text-lg font-medium mt-6 mb-2">Types of Tasks:</h3>
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-border">
              <h4 className="font-medium flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                  <path d="m9 12 2 2 4-4"/>
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/>
                </svg>
                Automatic Verification
              </h4>
              <p className="text-sm mt-1">These tasks are verified automatically when you connect accounts or complete actions on integrated platforms.</p>
              <p className="text-sm text-muted-foreground mt-2">Example: Connecting your Discord account, verifying your GitHub profile</p>
            </div>
            
            <div className="p-3 rounded-lg border border-border">
              <h4 className="font-medium flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" x2="12" y1="8" y2="12"/>
                  <line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                Manual Review
              </h4>
              <p className="text-sm mt-1">These tasks require an admin to review your submission before marking it as complete.</p>
              <p className="text-sm text-muted-foreground mt-2">Example: Introducing yourself, submitting work samples</p>
            </div>
            
            <div className="p-3 rounded-lg border border-border">
              <h4 className="font-medium flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                  <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1"/>
                  <path d="M17 3h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1"/>
                  <path d="M12 12v3"/>
                  <path d="M8 21v-3"/>
                  <path d="M16 21v-3"/>
                  <path d="M8 18h8"/>
                  <path d="M12 3v6"/>
                </svg>
                Community Participation
              </h4>
              <p className="text-sm mt-1">These tasks involve interacting with the community in meaningful ways.</p>
              <p className="text-sm text-muted-foreground mt-2">Example: Joining community calls, participating in events</p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 mt-6">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Pro Tip
            </h4>
            <p className="text-sm mt-2">Don&apos;t rush through tasks just to complete them. The onboarding process is designed to help you genuinely connect with the community and understand how it works.</p>
          </div>
        </div>
      )
    },
    {
      id: 'getting-help',
      title: 'Getting Help',
      description: 'How to reach out for assistance during onboarding',
      icon: LifeBuoy,
      content: (
        <div className="space-y-4">
          <p>If you get stuck during the onboarding process or have questions, there are several ways to get help.</p>
          
          <h3 className="text-lg font-medium mt-6 mb-2">Support Options:</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium">Community Support</h4>
                <p className="text-sm mt-1">Ask questions in the dedicated support channels in Discord/Telegram</p>
                <p className="text-sm text-primary mt-1 cursor-pointer hover:underline">Join Support Channel →</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium">Community Mentors</h4>
                <p className="text-sm mt-1">Connect with experienced community members who can guide you</p>
                <p className="text-sm text-primary mt-1 cursor-pointer hover:underline">Find a Mentor →</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium">Admin Support</h4>
                <p className="text-sm mt-1">For urgent issues or technical problems, contact an admin directly</p>
                <p className="text-sm text-primary mt-1 cursor-pointer hover:underline">Contact Admin →</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border border-border overflow-hidden mt-6">
            <div className="bg-card/50 p-4 border-b border-border">
              <h4 className="font-medium">Common Questions</h4>
            </div>
            <div className="divide-y divide-border">
              <div className="p-4">
                <p className="font-medium text-sm">How long does the onboarding process take?</p>
                <p className="text-sm text-muted-foreground mt-1">It varies by path, but most members complete it within 1-2 weeks.</p>
              </div>
              <div className="p-4">
                <p className="font-medium text-sm">What if I can&apos;t complete a specific task?</p>
                <p className="text-sm text-muted-foreground mt-1">Reach out to an admin to discuss alternative options or exemptions.</p>
              </div>
              <div className="p-4">
                <p className="font-medium text-sm">Can I change my onboarding path?</p>
                <p className="text-sm text-muted-foreground mt-1">Yes, contact an admin to switch to a different path if needed.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
  ];

  // Use the appropriate articles based on admin status
  const articles = isAdmin ? adminHelpArticles : userHelpArticles;
  
  // State for the selected article
  const [selectedArticleId, setSelectedArticleId] = useState<string>(articles[0].id);
  
  // Find the selected article
  const selectedArticle = articles.find(article => article.id === selectedArticleId) || articles[0];

  return (
    <>
      {/* Section title with animation */}
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Help & Documentation</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          {isAdmin 
            ? "Documentation and guides for administering your community onboarding process" 
            : "Learn how to use the onboarding wizard and get help"}
        </p>
      </div>
      
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with articles list */}
        <div className="lg:col-span-1 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-150">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Documentation</CardTitle>
              <CardDescription>Browse help articles</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-6">
              <div className="space-y-1.5">
                {articles.map((article) => (
                  <Button
                    key={article.id}
                    variant={selectedArticleId === article.id ? "secondary" : "ghost"}
                    className={`justify-start w-full transition-all duration-200 text-left ${
                      selectedArticleId === article.id 
                        ? "bg-secondary text-secondary-foreground font-medium" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSelectedArticleId(article.id)}
                  >
                    <article.icon className={`h-4 w-4 mr-2 shrink-0 ${selectedArticleId === article.id ? 'text-primary' : ''}`} />
                    <div className="truncate">{article.title}</div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content area */}
        <div className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 to-primary/10"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <selectedArticle.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>{selectedArticle.title}</CardTitle>
                  <CardDescription className="mt-1">{selectedArticle.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              {selectedArticle.content}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}; 