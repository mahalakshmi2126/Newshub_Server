import express from 'express';
const router = express.Router();
import { getStates, getDistricts, addDistrict, deleteDistrict, addTaluk, deleteTaluk } from '../controllers/locationController.js'

// ✅ Get all unique states
router.get('/states', getStates);

// ✅ Get all or filtered districts
router.get('/districts', getDistricts);

// ✅ Add new district
router.post('/add/districts', addDistrict);

// ✅ Delete district
router.delete('/districts/:id', deleteDistrict);

// ✅ Add taluk to district
router.post('/districts/:id/taluks', addTaluk);

// ✅ Delete taluk from district
router.delete('/districts/:districtId/taluks/:talukName', deleteTaluk);

export default router;