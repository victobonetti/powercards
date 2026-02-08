import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Upload, Layers, Edit3, ArrowRight, ArrowLeft, User, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface HelpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentStep: number;
    onStepChange: (step: number) => void;
}

// Moved steps inside component to access 't' or make it a function


export function HelpModal({ open, onOpenChange, currentStep, onStepChange }: HelpModalProps) {
    const { t } = useLanguage();

    const steps = [
        {
            title: t.help.welcomeTitle,
            description: t.help.welcomeDescription,
            icon: <div className="p-4 bg-primary/10 rounded-full mb-4"><Layers className="w-12 h-12 text-primary" /></div>
        },
        {
            title: t.help.workspacesTitle,
            description: t.help.workspacesDescription,
            icon: <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-4"><Layers className="w-12 h-12 text-orange-600 dark:text-orange-400" /></div>
        },
        {
            title: t.help.uploadTitle,
            description: t.help.uploadDescription,
            icon: <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4"><Upload className="w-12 h-12 text-blue-600 dark:text-blue-400" /></div>
        },
        {
            title: t.help.manageTitle,
            description: t.help.manageDescription,
            icon: <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4"><Edit3 className="w-12 h-12 text-green-600 dark:text-green-400" /></div>
        },
        {
            title: t.help.profileTitle,
            description: t.help.profileDescription,
            icon: <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4"><User className="w-12 h-12 text-purple-600 dark:text-purple-400" /></div>
        },
        {
            title: t.help.aiTitle,
            description: t.help.aiDescription,
            icon: <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4"><Sparkles className="w-12 h-12 text-yellow-600 dark:text-yellow-400" /></div>
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            onStepChange(currentStep + 1);
        } else {
            onOpenChange(false);
            setTimeout(() => onStepChange(0), 300); // Reset after close
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            onStepChange(currentStep - 1);
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
                            <ArrowLeft className="mr-2 h-4 w-4" /> {t.common.back}
                        </Button>

                        <Button onClick={handleNext}>
                            {currentStep === steps.length - 1 ? t.common.finish : t.common.next}
                            {currentStep !== steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
