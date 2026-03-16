export interface CategoryDetails {
    id: number;
    key: string;
    name: string;
    description: string;
    parentId?: number;
    isEnabled: boolean;
    isSystem: boolean;
    systemCode: string;
    children: CategoryDetails[];
}

export const createCategoryDetails = (data?: Partial<CategoryDetails>): CategoryDetails => ({
    id: 0,
    key: "",
    name: "",
    description: "",
    parentId: undefined,
    isEnabled: false,
    isSystem: false,
    systemCode: "",
    children: [],
    ...data,
});

export const defaultCategory: CategoryDetails = createCategoryDetails({
    id: -1,
    key: "Выберите категорию",
    name: "Выберите категорию",
    description: "Выберите категорию",
    isEnabled: true,
});

const removeEmptyChildren = (node: any) => {
    if (Array.isArray(node.children)) {
        node.children = node.children
            .map(removeEmptyChildren)
            .filter(Boolean);
        if (node.children.length === 0) {
            delete node.children;
        }
    }
    return node;
}

const flattenCategories = (categories: CategoryDetails[], depth = 0): (Omit<CategoryDetails, "children"> & { depth: number })[] => {
    return categories.flatMap(cat => {
        const { children, ...rest } = cat;
        const flatItem = { ...rest, depth };
        return [
            flatItem,
            ...(children ? flattenCategories(children, depth + 1) : [])
        ];
    });
}

export const getCategoriesTree = (categoriesData: any[], flat: boolean): (Omit<CategoryDetails, "children"> & { depth: number })[] | CategoryDetails[] => {
    if (!categoriesData || categoriesData.length === 0) {
        return [];
    }

    const categories = categoriesData.map((item: any) =>
        createCategoryDetails({ ...item, children: [] })
    );

    const rootCategories: CategoryDetails[] = categories.filter(
        (item: CategoryDetails) =>
            (item.parentId === null || item.parentId === undefined) &&
            item.isSystem === false
    );

    const rootSystem: CategoryDetails = createCategoryDetails({
        id: 0,
        key: "Системные транзакции",
        name: "Системные транзакции",
        description: "Системные транзакции",
        isEnabled: true,
        isSystem: true,
        children: [],
    });

    rootCategories.push(rootSystem);

    rootCategories.forEach((rootCategory: CategoryDetails) => {
        let childCategories: CategoryDetails[] = [];

        if (rootCategory.isSystem) {
            childCategories = categories.filter(
                (item: CategoryDetails) => item.isSystem === true
            );
        } else {
            childCategories = categories.filter(
                (item: CategoryDetails) => item.parentId === rootCategory.id
            );
        }

        rootCategory.children = childCategories;
    });

    if (flat === false) {
        return rootCategories.map(removeEmptyChildren);
    } else {
        return flattenCategories(rootCategories);
    }
};