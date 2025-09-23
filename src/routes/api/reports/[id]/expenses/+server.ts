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

    const expenses = await reportModel.getReportExpenses(reportId);

    return json({
      success: true,
      results: expenses
    });
  } catch (error) {
    console.error('Error fetching report expenses:', error);
    return json({
      success: false,
      errors: [{ code: 500, message: (error as Error).message }]
    }, { status: 500 });
  }
};