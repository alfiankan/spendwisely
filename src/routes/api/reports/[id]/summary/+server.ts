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

    const summary = await reportModel.getReportSummary(reportId);

    return json({
      success: true,
      result: summary
    });
  } catch (error) {
    console.error('Error fetching report summary:', error);
    return json({
      success: false,
      errors: [{ code: 500, message: (error as Error).message }]
    }, { status: 500 });
  }
};