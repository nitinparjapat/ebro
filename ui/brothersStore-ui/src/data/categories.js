import products from "./products";

const categories = [
  {
    id: "all",
    name: "All",
    image: products[0]?.images?.[0] ?? "https://picsum.photos/200",
  },
  ...products.reduce((uniqueCategories, product) => {

    const alreadyExists = uniqueCategories.find(
      (category) => category.name === product.category
    );

    if (alreadyExists) {
      return uniqueCategories;
    }

    return [
      ...uniqueCategories,
      {
        id: product.category.toLowerCase().replace(/\s+/g, "-"),
        name: product.category,
        image: product.images?.[0] ?? "https://picsum.photos/200",
      },
    ];

  }, []),
];

export default categories;
