import { NextRequest, NextResponse } from 'next/server';

// Get Zalo instance from shared in-memory storage
const getZaloInstance = (sessionId: string) => {
  return (global as any).zaloInstances?.get(sessionId);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Get Zalo instance
    const api = getZaloInstance(sessionId);
    
    const availableSessions = Array.from((global as any).zaloInstances?.keys() || []);
    
    console.log('Session ID:', sessionId);
    console.log('API instance found:', !!api);
    console.log('Available sessions:', availableSessions);
    console.log('Global zaloInstances type:', typeof (global as any).zaloInstances);
    console.log('Global zaloInstances size:', (global as any).zaloInstances?.size || 0);

    if (!api) {
      return NextResponse.json(
        { 
          error: 'Zalo session not found. Vui lòng đăng nhập bằng QR code trước.',
          debug: {
            sessionId,
            availableSessions: availableSessions,
            hasGlobalInstances: !!(global as any).zaloInstances,
            globalSize: (global as any).zaloInstances?.size || 0
          }
        },
        { status: 404 }
      );
    }

    // Get all groups
    let groupsResponse;
    try {
      groupsResponse = await api.getAllGroups();
      console.log('getAllGroups response:', JSON.stringify(groupsResponse, null, 2));
    } catch (error) {
      console.error('getAllGroups API call failed:', error);
      return NextResponse.json(
        { 
          error: 'Failed to call getAllGroups API: ' + (error instanceof Error ? error.message : String(error))
        },
        { status: 500 }
      );
    }

    // Extract group IDs from gridVerMap
    // Response structure might be: { data: { gridVerMap: {...} } } or { gridVerMap: {...} }
    const gridVerMap = groupsResponse?.data?.gridVerMap || groupsResponse?.gridVerMap || {};
    const groupIds = Object.keys(gridVerMap);
    
    console.log('Found group IDs:', groupIds);

    // Get detailed info for all groups
    let groupsInfo: any[] = [];
    if (groupIds.length > 0) {
      try {
        const groupsInfoResponse = await api.getGroupInfo(groupIds);
        console.log('getGroupInfo response:', JSON.stringify(groupsInfoResponse, null, 2));
        
        // Response structure might be: { data: { gridInfoMap: {...} } } or { gridInfoMap: {...} }
        const gridInfoMap = groupsInfoResponse.data?.gridInfoMap || groupsInfoResponse.gridInfoMap || {};
        
        groupsInfo = Object.entries(gridInfoMap).map(([groupId, info]: [string, any]) => ({
          groupId,
          name: info.name || 'Không có tên',
          avatar: info.avt || info.fullAvt || '',
          totalMember: info.totalMember || 0,
          desc: info.desc || '',
        }));
      } catch (error) {
        console.error('Error getting group info:', error);
        // If getGroupInfo fails, just return group IDs
        groupsInfo = groupIds.map(id => ({ groupId: id, name: `Group ${id}` }));
      }
    } else {
      console.log('No groups found');
    }

    return NextResponse.json({
      success: true,
      groups: groupsInfo,
      total: groupsInfo.length,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Failed to get groups: ' + errorMessage,
        debug: {
          message: errorMessage,
          stack: errorStack,
          type: error instanceof Error ? error.constructor.name : typeof error
        }
      },
      { status: 500 }
    );
  }
}

