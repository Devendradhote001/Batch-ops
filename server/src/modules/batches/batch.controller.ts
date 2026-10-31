import type { Request, Response } from 'express';
import { getAuthUser } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/response';
import type { ListBatchesQuery } from './batch.schema';
import * as batchService from './batch.service';

type IdParams = { id: string };

export async function list(req: Request, res: Response) {
  const { items, meta } = await batchService.listBatches(getAuthUser(req), req.query as unknown as ListBatchesQuery);
  sendSuccess(res, items, { meta });
}

export async function get(req: Request<IdParams>, res: Response) {
  sendSuccess(res, await batchService.getBatch(getAuthUser(req), req.params.id));
}

export async function create(req: Request, res: Response) {
  const batch = await batchService.createBatch(getAuthUser(req), req.body);
  sendSuccess(res, batch, { status: 201, message: 'Batch created' });
}

export async function update(req: Request<IdParams>, res: Response) {
  const batch = await batchService.updateBatch(getAuthUser(req), req.params.id, req.body);
  sendSuccess(res, batch, { message: 'Batch updated' });
}

export async function setArchived(req: Request<IdParams>, res: Response) {
  const batch = await batchService.setBatchArchived(getAuthUser(req), req.params.id, req.body.isArchived);
  sendSuccess(res, batch, { message: batch.isArchived ? 'Batch archived' : 'Batch restored' });
}

export async function setModuleCompleted(req: Request<IdParams & { moduleId: string }>, res: Response) {
  const { id, moduleId } = req.params;
  const batch = await batchService.setModuleCompleted(getAuthUser(req), id, moduleId, req.body.isCompleted);
  sendSuccess(res, batch);
}
