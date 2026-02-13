import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { KeyRound, Settings } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface AIKeyRequiredModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AIKeyRequiredModal({ open, onOpenChange }: AIKeyRequiredModalProps) {
    const navigate = useNavigate();
    const { lang } = useParams();
    const { t } = useLanguage();

    const handleConfigureNow = () => {
        onOpenChange(false);
        navigate(`/${lang}/profile`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <KeyRound className="h-8 w-8 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl">
                        {t.aiModal.title}
                    </DialogTitle>
                    <DialogDescription className="text-center text-base pt-2">
                        {t.aiModal.description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col gap-2 sm:flex-col">
                    <Button onClick={handleConfigureNow} className="w-full gap-2">
                        <Settings className="h-4 w-4" />
                        {t.aiModal.configureNow}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="w-full"
                    >
                        {t.common.cancel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
