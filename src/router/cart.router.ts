import {Router} from "express";

const cartRouter = Router();

cartRouter.get("/", (req, res) => {
    res.status(200).send({message: "Cart is running"});
})

export default cartRouter;