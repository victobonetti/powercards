import { useEffect, useState, ReactNode } from "react";
import { GripVertical } from "lucide-react";

interface ResizableSidebarProps {
    children: ReactNode;
    initialWidth?: number;
    minWidth?: number;
    maxWidthPct?: number;
}

export function ResizableSidebar({
    children,
    initialWidth = 450,
    minWidth = 400,
    maxWidthPct = 0.5
}: ResizableSidebarProps) {
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            // Calculate new width: Total Width - Mouse X
            // Assumes sidebar is on the right
            let newWidth = window.innerWidth - e.clientX;

            const max = window.innerWidth * maxWidthPct;

            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > max) newWidth = max;

            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
        };
    }, [isResizing, minWidth, maxWidthPct]);

    return (
        <div
            className="relative border-l bg-background shadow-xl z-20 flex"
            style={{ width }}
        >
            {/* Drag Handle */}
            <div
                className="absolute left-0 top-0 bottom-0 w-4 -ml-2 cursor-col-resize z-50 flex items-center justify-center group outline-none"
                onMouseDown={() => setIsResizing(true)}
            >
                <div className="w-1 h-full hover:bg-primary/50 transition-colors group-hover:bg-primary/50" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>

            <div className="flex-1 overflow-hidden animate-in slide-in-from-right duration-300">
                {children}
            </div>
        </div>
    );
}
