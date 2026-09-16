import { Router } from "express";
import { addLand, myProfile } from "../controllers/farmerController.js";
import { authenticate, allowRoles } from "../middleware/auth.js";
import { uploadOwnershipProof } from "../middleware/upload.js";
const router = Router();
router.use(authenticate, allowRoles("farmer"));
router.get("/me", myProfile);
router.post("/lands", uploadOwnershipProof, addLand);
export default router;
