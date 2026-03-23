import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppFrame } from "@/components/platform/AppFrame";
import { studentNav } from "../roleNav";

export default function StudentLecturePage() {
    return (
        <AppFrame
            roleLabel="Student"
            title="Lecture Player"
            subtitle="Learn in split-view with video, transcript, AI doubts, and notes."
            navItems={studentNav}
        >
            <div className="grid gap-6 lg:grid-cols-3">
                <section className="lg:col-span-2 dei-card p-4 md:p-5">
                    <div className="aspect-video rounded-2xl bg-gradient-to-br from-dei-sky/20 to-dei-lavender/20 p-6">
                        <div className="flex h-full items-center justify-center rounded-xl border border-border/50 bg-card text-sm text-muted-foreground">
                            Video player area
                        </div>
                    </div>
                </section>

                <section className="dei-card p-4 md:p-5">
                    <Tabs defaultValue="transcript" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="transcript">Transcript</TabsTrigger>
                            <TabsTrigger value="doubts">AI Doubts</TabsTrigger>
                            <TabsTrigger value="notes">Notes</TabsTrigger>
                        </TabsList>
                        <TabsContent value="transcript" className="mt-4 text-sm text-muted-foreground">
                            The model predicts tokens based on context and probability distribution...
                        </TabsContent>
                        <TabsContent value="doubts" className="mt-4 text-sm text-muted-foreground">
                            Suggested: Why does temperature affect response style?
                        </TabsContent>
                        <TabsContent value="notes" className="mt-4 text-sm text-muted-foreground">
                            Key takeaway: Use retrieval for factual consistency.
                        </TabsContent>
                    </Tabs>
                </section>
            </div>
        </AppFrame>
    );
}
