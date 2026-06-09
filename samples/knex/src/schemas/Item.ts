import { registerSchema } from "swaggiffy";

registerSchema("Item", {
    id: 0,
    name: "",
    description: "",
    quantity: 0,
    price: 0,
    userId: 0,
    createdAt: new Date(),
});
