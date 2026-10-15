export const ENDPOINTS = {
  CATEGORIES: {
    GET_ALL: "/categories",

    GET_BY_ID: (
      id: number | string
    ) =>
      `/categories/${id}`,

    CREATE: "/categories",

    UPDATE: (
      id: number | string
    ) =>
      `/categories/${id}`,

    DELETE: (
      id: number | string
    ) =>
      `/categories/${id}`,
  },

  INGREDIENTS: {
    GET_ALL: "/ingredients",

    GET_BY_ID: (
      id: number | string
    ) =>
      `/ingredients/${id}`,

    CREATE: "/ingredients",

    UPDATE: (
      id: number | string
    ) =>
      `/ingredients/${id}`,

    DELETE: (
      id: number | string
    ) =>
      `/ingredients/${id}`,
  },

  RECIPES: {
    GET_ALL: "/recipes",

    GET_BY_ID: (
      id: number | string
    ) =>
      `/recipes/${id}`,

    CREATE: "/recipes",

    UPDATE: (
      id: number | string
    ) =>
      `/recipes/${id}`,

    DELETE: (
      id: number | string
    ) =>
      `/recipes/${id}`,

    CALCULATE: (
      id: number | string
    ) =>
      `/recipes/${id}/calculate`,
  },
} as const;