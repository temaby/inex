import * as React from 'react';

export interface PageSectionProps {
    children: React.ReactNode;
    gap?: number | string;
    style?: React.CSSProperties;
}

export interface ResponsiveStackProps {
    children: React.ReactNode;
    gap?: number | string;
    breakpoint?: number;
    style?: React.CSSProperties;
}

export interface ResponsiveGridProps {
    children: React.ReactNode;
    minColumnWidth?: number;
    gap?: number | string;
    style?: React.CSSProperties;
}

export const PageSection: React.FC<PageSectionProps> = ({ children, gap = "var(--space-4)", style }) => (
    <section
        style={{
            display: "grid",
            gap,
            minWidth: 0,
            ...style,
        }}
    >
        {children}
    </section>
);

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
    children,
    gap = "var(--space-4)",
    breakpoint = 768,
    style,
}) => {
    const query = `(max-width: ${breakpoint}px)`;
    const getMatches = React.useCallback(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia(query).matches;
    }, [query]);

    const [isStacked, setIsStacked] = React.useState(getMatches);

    React.useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const mediaQuery = window.matchMedia(query);
        setIsStacked(mediaQuery.matches);

        const handleChange = (event: MediaQueryListEvent) => setIsStacked(event.matches);
        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [query]);

    return (
        <div
            style={{
                alignItems: isStacked ? "stretch" : "center",
                display: "flex",
                flexDirection: isStacked ? "column" : "row",
                gap,
                minWidth: 0,
                ...style,
            }}
        >
            {children}
        </div>
    );
};

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
    children,
    minColumnWidth = 280,
    gap = "var(--space-4)",
    style,
}) => (
    <div
        style={{
            display: "grid",
            gap,
            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}px), 1fr))`,
            minWidth: 0,
            ...style,
        }}
    >
        {children}
    </div>
);
