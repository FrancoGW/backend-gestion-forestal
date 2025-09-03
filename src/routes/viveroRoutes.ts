import { Router } from 'express';
import {
  getAllViveros,
  createVivero,
  getViveroById,
  updateVivero,
  deleteVivero,
  getEstadisticas,
  getClonesByVivero,
  testConnection
} from '../controllers/viveroController';
import {
  validateViveroData,
  validateViveroId,
  viveroErrorHandler
} from '../middleware/viveroMiddleware';

const router = Router();

// Ruta de prueba de conexión
router.get('/test', testConnection);

// Rutas principales de viveros
router.get('/', getAllViveros);
router.post('/', validateViveroData, createVivero);
router.get('/estadisticas', getEstadisticas);

// Rutas con ID de vivero
router.get('/:id', validateViveroId, getViveroById);
router.put('/:id', validateViveroId, validateViveroData, updateVivero);
router.delete('/:id', validateViveroId, deleteVivero);

// Ruta para obtener clones de un vivero específico
router.get('/:id/clones', validateViveroId, getClonesByVivero);

// Middleware de manejo de errores
router.use(viveroErrorHandler);

export default router;
