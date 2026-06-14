export interface DistributionSource<TPayload = unknown> {
    key: string;
    label: string;
    value: number;
    payload?: TPayload;
}

export interface DistributionItem<TPayload = unknown> extends DistributionSource<TPayload> {
    share: number;
    isOther: boolean;
}

const DISTRIBUTION_PALETTE = [
    "#1D4ED8",
    "#0F766E",
    "#9333EA",
    "#DB2777",
    "#EA580C",
    "#65A30D",
    "#475569",
    "#7C3AED",
    "#0891B2",
    "#BE123C",
    "#4D7C0F",
    "#A16207",
];

const hashString = (value: string): number => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
};

export const buildTopDistribution = <TPayload>(
    items: DistributionSource<TPayload>[],
    {
        maxItems = 5,
        otherKey = "other",
        otherLabel = "Other",
    }: {
        maxItems?: number;
        otherKey?: string;
        otherLabel?: string;
    } = {},
): DistributionItem<TPayload>[] => {
    const positiveItems = items.filter((item) => Number.isFinite(item.value) && item.value > 0);
    const total = positiveItems.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) return [];

    const topItems = positiveItems.slice(0, maxItems);
    const otherTotal = positiveItems.slice(maxItems).reduce((sum, item) => sum + item.value, 0);
    const distribution = topItems.map((item) => ({
        ...item,
        share: item.value / total,
        isOther: false,
    }));

    if (otherTotal > 0) {
        distribution.push({
            key: otherKey,
            label: otherLabel,
            value: otherTotal,
            share: otherTotal / total,
            isOther: true,
        });
    }

    return distribution;
};

export const buildUniqueDistributionColors = (
    keys: string[],
    preferredColors: Record<string, string | undefined> = {},
): Record<string, string> => {
    const used = new Set<string>();
    const result: Record<string, string> = {};

    keys.forEach((key, index) => {
        const preferred = preferredColors[key];
        if (preferred && !used.has(preferred)) {
            result[key] = preferred;
            used.add(preferred);
            return;
        }

        const seed = hashString(`${key}:${index}`);
        let paletteIndex = seed % DISTRIBUTION_PALETTE.length;
        for (let attempts = 0; attempts < DISTRIBUTION_PALETTE.length; attempts += 1) {
            const color = DISTRIBUTION_PALETTE[paletteIndex];
            if (!used.has(color)) {
                result[key] = color;
                used.add(color);
                return;
            }
            paletteIndex = (paletteIndex + 1) % DISTRIBUTION_PALETTE.length;
        }

        const hue = (seed + index * 47) % 360;
        result[key] = `hsl(${hue} 70% 38%)`;
        used.add(result[key]);
    });

    return result;
};
