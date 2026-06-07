export function decomposeProject(prompt: string, type: string, files: any[]) {
  const tasks = [];
  
  // Analyze project and create tasks based on files and type
  if (type === 'web' || type === 'dashboard') {
    tasks.push({
      title: 'Setup HTML structure',
      description: 'Create the main HTML file with proper DOCTYPE, meta tags, and viewport settings',
      priority: 'high',
      dependencies: [],
    });
    
    tasks.push({
      title: 'Implement CSS styling',
      description: 'Add responsive CSS with Tailwind or custom styles for all components',
      priority: 'high',
      dependencies: ['Setup HTML structure'],
    });
    
    tasks.push({
      title: 'Add JavaScript functionality',
      description: 'Implement interactivity, event handlers, and dynamic content',
      priority: 'high',
      dependencies: ['Setup HTML structure'],
    });
    
    tasks.push({
      title: 'Responsive design optimization',
      description: 'Ensure mobile-friendly layout and cross-browser compatibility',
      priority: 'medium',
      dependencies: ['Implement CSS styling'],
    });
    
    tasks.push({
      title: 'Performance optimization',
      description: 'Optimize images, minify CSS/JS, and improve load times',
      priority: 'low',
      dependencies: ['Add JavaScript functionality'],
    });
  } else if (type === 'mobile') {
    tasks.push({
      title: 'Setup Expo project structure',
      description: 'Initialize Expo app with proper configuration and navigation',
      priority: 'high',
      dependencies: [],
    });
    
    tasks.push({
      title: 'Implement React Native screens',
      description: 'Create all app screens with proper layout and styling',
      priority: 'high',
      dependencies: ['Setup Expo project structure'],
    });
    
    tasks.push({
      title: 'Add navigation and routing',
      description: 'Setup Expo Router with tab and stack navigation',
      priority: 'high',
      dependencies: ['Setup Expo project structure'],
    });
    
    tasks.push({
      title: 'Implement state management',
      description: 'Add React Context, Zustand, or Redux for app state',
      priority: 'medium',
      dependencies: ['Implement React Native screens'],
    });
    
    tasks.push({
      title: 'Add platform-specific features',
      description: 'Implement iOS/Android specific features and optimizations',
      priority: 'medium',
      dependencies: ['Implement React Native screens'],
    });
  }
  
  // Add file-specific tasks
  if (files && files.length > 0) {
    const hasCSS = files.some((f: any) => f.path?.endsWith('.css') || f.language === 'css');
    const hasJS = files.some((f: any) => f.path?.endsWith('.js') || f.language === 'javascript');
    const hasAssets = files.some((f: any) => f.path?.includes('assets') || f.path?.includes('images'));
    
    if (!hasCSS) {
      tasks.push({
        title: 'Add CSS styling',
        description: 'Create styles.css with proper styling for all components',
        priority: 'high',
        dependencies: ['Setup HTML structure'],
      });
    }
    
    if (!hasJS) {
      tasks.push({
        title: 'Add JavaScript interactivity',
        description: 'Create script.js with event handlers and dynamic functionality',
        priority: 'high',
        dependencies: ['Setup HTML structure'],
      });
    }
    
    if (!hasAssets) {
      tasks.push({
        title: 'Add image assets',
        description: 'Create placeholder images and icons for the app',
        priority: 'low',
        dependencies: ['Implement CSS styling'],
      });
    }
  }
  
  return { tasks };
}

export function matchAgentToTask(task: any, agents: any[]) {
  // Simple matching based on task title keywords
  const taskTitle = task.title.toLowerCase();
  
  for (const agent of agents) {
    const agentName = (agent.name || '').toLowerCase();
    const agentRole = (agent.role || '').toLowerCase();
    
    if (taskTitle.includes('css') || taskTitle.includes('style')) {
      if (agentName.includes('css') || agentRole.includes('style')) {
        return agent;
      }
    }
    
    if (taskTitle.includes('javascript') || taskTitle.includes('js') || taskTitle.includes('script')) {
      if (agentName.includes('js') || agentRole.includes('dev') || agentRole.includes('frontend')) {
        return agent;
      }
    }
    
    if (taskTitle.includes('html') || taskTitle.includes('structure')) {
      if (agentName.includes('html') || agentRole.includes('structure')) {
        return agent;
      }
    }
    
    if (taskTitle.includes('mobile') || taskTitle.includes('react native')) {
      if (agentName.includes('mobile') || agentRole.includes('mobile') || agentRole.includes('react native')) {
        return agent;
      }
    }
    
    if (taskTitle.includes('backend') || taskTitle.includes('api')) {
      if (agentName.includes('backend') || agentRole.includes('backend') || agentRole.includes('api')) {
        return agent;
      }
    }
    
    if (taskTitle.includes('test') || taskTitle.includes('qa')) {
      if (agentName.includes('test') || agentRole.includes('test') || agentRole.includes('qa')) {
        return agent;
      }
    }
  }
  
  // Return first available agent if no match
  return agents[0] || null;
}

export function calculateExecutionOrder(tasks: any[]) {
  // Simple topological sort based on dependencies
  const taskMap = new Map(tasks.map((t: any, i: number) => [t.title, { ...t, index: i }]));
  const visited = new Set();
  const order: any[] = [];
  
  function visit(task: any) {
    if (visited.has(task.title)) return;
    visited.add(task.title);
    
    if (task.dependencies && task.dependencies.length > 0) {
      for (const dep of task.dependencies) {
        const depTask = taskMap.get(dep);
        if (depTask) {
          visit(depTask);
        }
      }
    }
    
    order.push(task);
  }
  
  for (const task of tasks) {
    visit(task);
  }
  
  return order;
}
