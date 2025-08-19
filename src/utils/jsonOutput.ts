import { linearService } from '../services/linear.ts';

export async function outputAsJson(command: string, args: string[]) {
  try {
    let data: any;
    
    switch (command) {
      case 'dashboard':
      case 'dash':
        data = await getDashboardData();
        break;
      
      case 'issues':
        data = await linearService.getIssues();
        break;
      
      case 'issue':
        if (!args[0]) {
          throw new Error('Issue ID required');
        }
        data = await linearService.getIssue(args[0]);
        break;
      
      case 'teams':
        data = await linearService.getTeams();
        break;
      
      case 'projects':
        data = await linearService.getProjects();
        break;
      
      case 'me':
        data = await linearService.getMyIssues();
        break;
      
      case 'search':
        if (!args[0]) {
          throw new Error('Search query required');
        }
        data = await linearService.searchIssues(args[0]);
        break;
      
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
    
  } catch (error) {
    console.error(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, null, 2));
    process.exit(1);
  }
}

async function getDashboardData() {
  const myIssues = await linearService.getMyIssues();
  
  const urgentIssues = myIssues.filter(issue => issue.priority === 1);
  const inProgressIssues = myIssues.filter(issue => issue.state_name === 'In Progress');
  const todoIssues = myIssues.filter(issue => issue.state_name === 'Todo');
  
  return {
    stats: {
      total: myIssues.length,
      urgent: urgentIssues.length,
      inProgress: inProgressIssues.length,
      todo: todoIssues.length
    },
    urgentIssues,
    myIssues: myIssues.slice(0, 5), // Top 5 issues
    hasMore: myIssues.length > 5
  };
}