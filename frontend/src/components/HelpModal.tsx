import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Upload, Layers, Edit3, ArrowRight, ArrowLeft } from "lucide-react";

interface HelpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const steps = [
    {
        title: "Welcome to PowerCards",
        description: "Your advanced Anki deck manager. Let's get you started with a quick tour of the main features.",
        icon: <div className="p-4 bg-primary/10 rounded-full mb-4"><Layers className="w-12 h-12 text-primary" /></div>
    },
    {
        title: "1. Workspaces",
        description: "Organize your decks and notes into isolated Workspaces. Use the selector in the sidebar to create new workspaces or switch contexts.",
        icon: <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-4"><Layers className="w-12 h-12 text-orange-600 dark:text-orange-400" /></div>
    },
    {
        title: "2. Upload Anki Files",
        description: "Upload your existing .apkg files. PowerCards works directly with your Anki collection. Just drag and drop to import.",
        icon: <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4"><Upload className="w-12 h-12 text-blue-600 dark:text-blue-400" /></div>
    },
    {
        title: "3. Manage & Edit",
        description: "Browse your decks, search for notes, edit fields, and manage tags. All changes are synchronized with your database.",
        icon: <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4"><Edit3 className="w-12 h-12 text-green-600 dark:text-green-400" /></div>
    }
];

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onOpenChange(false);
            setTimeout(() => setCurrentStep(0), 300); // Reset after close
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex flex-col items-center text-center pt-4">
                        {steps[currentStep].icon}
                        <DialogTitle className="text-xl mb-2">{steps[currentStep].title}</DialogTitle>
                        <DialogDescription className="text-base">
                            {steps[currentStep].description}
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <DialogFooter className="flex items-center justify-between sm:justify-between mt-6">
                    <div className="flex gap-1 justify-center w-full sm:w-auto order-2 sm:order-1 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 w-2 rounded-full transition-all ${index === currentStep ? "bg-primary w-4" : "bg-muted"}`}
                            />
                        ))}
                    </div>

                    <div className="flex justify-between w-full">
                        <Button
                            variant="ghost"
                            onClick={handlePrevious}
                            disabled={currentStep === 0}
                            className={currentStep === 0 ? "invisible" : ""}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>

                        <Button onClick={handleNext}>
                            {currentStep === steps.length - 1 ? "Finish" : "Next"}
                            {currentStep !== steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
