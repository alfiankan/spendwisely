import { json } from '@sveltejs/kit';
import { ReportModel } from '$lib/models/ReportModel';
import type { RequestHandler } from './$types';

const reportModel = new ReportModel();

export const GET: RequestHandler = async ({ params }) => {
  try {
    const reportId = parseInt(params.id);
    
    if (isNaN(reportId)) {
      return json({
        success: false,
        errors: [{ code: 400, message: 'Invalid report ID' }]
      }, { status: 400 });
    }

    const report = await reportModel.getReportById(reportId);
    
    if (!report) {
      return json({
        success: false,
        errors: [{ code: 404, message: 'Report not found' }]
      }, { status: 404 });
    }

    return json({
      success: true,
      result: report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return json({
      success: false,
      errors: [{ code: 500, message: (error as Error).message }]
    }, { status: 500 });
  }
};