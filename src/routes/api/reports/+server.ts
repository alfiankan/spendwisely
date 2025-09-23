import { json } from '@sveltejs/kit';
import { ReportModel } from '$lib/models/ReportModel';
import type { RequestHandler } from './$types';

const reportModel = new ReportModel();

export const GET: RequestHandler = async ({ url }) => {
  try {
    const sortBy = url.searchParams.get('sortBy') || 'record_start';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    const reports = await reportModel.getAllReports({
      sortBy: sortBy as 'record_start' | 'record_end',
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    return json({
      success: true,
      results: reports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return json({
      success: false,
      errors: [{ code: 500, message: (error as Error).message }]
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { rangeLabel, startDate, endDate } = await request.json();

    if (!rangeLabel || !startDate || !endDate) {
      return json({
        success: false,
        errors: [{ code: 400, message: 'Missing required fields' }]
      }, { status: 400 });
    }

    const reportId = await reportModel.createReport(rangeLabel, startDate, endDate);
    await reportModel.captureExpensesToReport(reportId);

    return json({
      success: true,
      result: { id: reportId }
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return json({
      success: false,
      errors: [{ code: 500, message: (error as Error).message }]
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    
    if (!id) {
      return json({
        success: false,
        errors: [{ code: 400, message: 'Report ID is required' }]
      }, { status: 400 });
    }

    await reportModel.deleteReport(parseInt(id));

    return json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return json({
      success: false,
      errors: [{ code: 500, message: (error as Error).message }]
    }, { status: 500 });
  }
};