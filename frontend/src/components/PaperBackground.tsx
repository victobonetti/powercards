import { useEffect, useRef } from 'react';
import { useTheme } from './theme-provider';

export function PaperBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useTheme(); // Keep hook if needed for context subscription, or remove if not. 
    // Actually, we use 'theme' in dependency array? No, the previous edit removed it from dep array.
    // Let's check if useTheme is needed at all.
    // The previous edit removed 'theme' from useEffect dependency array and used mutation observer.
    // So we might not need useTheme hook anymore if we are observing DOM.
    // BUT, useTheme might trigger re-render on context change? 
    // The mutation observer handles the class change on <html/>.
    // So we can probably remove useTheme() entirely or just not destructure.

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // console.log("PaperBackground: Initializing canvas");

        const getComputedColor = (varName: string) => {
            const style = getComputedStyle(document.documentElement);
            return style.getPropertyValue(varName).trim();
        };

        const parseHsl = (hslStr: string) => {
            // Expects "H S% L%" or "H S L"
            // Remove 'deg', '%', etc if we want pure numbers, but usually we just want to split
            // Simple split by space
            const parts = hslStr.split(' ').map(s => parseFloat(s));
            if (parts.length >= 3) return { h: parts[0], s: parts[1], l: parts[2] };
            return null;
        };

        const draw = () => {
            // Set display size (css pixels).
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Set actual size in memory (scaled to account for extra pixel density).
            const scale = window.devicePixelRatio;
            canvas.width = Math.floor(width * scale);
            canvas.height = Math.floor(height * scale);

            // Normalize coordinate system to use css pixels.
            ctx.scale(scale, scale);

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            const isDark = document.documentElement.classList.contains('dark');

            // Get dynamic background color
            const bgVar = getComputedColor('--background'); // e.g. "265 30% 6%" or "0 0% 100%"
            const parsed = parseHsl(bgVar);

            let bgH = 0, bgS = 0, bgL = 100;

            if (parsed) {
                bgH = parsed.h;
                bgS = parsed.s;
                bgL = parsed.l;
            } else {
                // Fallback
                if (isDark) { bgH = 30; bgS = 10; bgL = 12; }
                else { bgH = 40; bgS = 20; bgL = 97; }
            }

            // Fill Background
            ctx.fillStyle = `hsl(${bgH} ${bgS}% ${bgL}%)`;
            ctx.fillRect(0, 0, width, height);

            // Create Texture (Dots)
            createTexture(ctx, width, height, isDark, bgH, bgS, bgL);

            // Create Fibers
            createFibers(ctx, width, height, isDark, bgH, bgS, bgL);
        };

        const createTexture = (ctx: CanvasRenderingContext2D, width: number, height: number, isDark: boolean, h: number, s: number, l: number) => {
            // Density calculation
            const density = 400 / (400 * 400);
            const pixelCount = width * height;
            const adjustedDots = Math.floor(pixelCount * density * 0.5);

            for (let i = 0; i < adjustedDots; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const r = (Math.random() * 10 + 5) / 2;

                ctx.beginPath();
                ctx.arc(x, y, r, 0, 2 * Math.PI);

                // Dot color: Shift Lightness
                const dotL = isDark ? l + 10 : l - 10;
                const alpha = isDark ? 0.1 : 0.3;

                ctx.fillStyle = `hsla(${h}, ${s}%, ${dotL}%, ${alpha})`;
                ctx.fill();
            }
        };

        const createFibers = (ctx: CanvasRenderingContext2D, width: number, height: number, isDark: boolean, h: number, s: number, l: number) => {
            const density = 3000 / (400 * 400);
            const pixelCount = width * height;
            const adjustedFibers = Math.floor(pixelCount * density * 0.2);

            for (let i = 0; i < adjustedFibers; i++) {
                const x1 = Math.random() * width;
                const y1 = Math.random() * height;
                const theta = Math.random() * 2 * Math.PI;
                const segmentLength = Math.random() * 5 + 2;
                const x2 = Math.cos(theta) * segmentLength + x1;
                const y2 = Math.sin(theta) * segmentLength + y1;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);

                // Fiber color: Shift variations
                const fiberS = Math.max(0, s + (Math.random() * 20 - 10));
                const fiberL = isDark ? l + (Math.random() * 20) : l - (Math.random() * 40);
                const alpha = isDark ? 0.3 : 0.4;

                ctx.strokeStyle = `hsla(${h}, ${fiberS}%, ${fiberL}%, ${alpha})`;
                ctx.stroke();
            }
        };

        window.addEventListener('resize', draw);
        // Observer for class/style changes on root (theme changes)
        const observer = new MutationObserver(draw);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });

        // Initial draw
        draw();

        return () => {
            window.removeEventListener('resize', draw);
            observer.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 -z-50 pointer-events-none w-full h-full text-foreground"
            style={{
                zIndex: -50
            }}
        />
    );
}
