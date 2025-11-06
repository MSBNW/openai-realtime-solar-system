# DreamCrew Task & Project Management System - Complete Documentation

## Executive Summary

DreamCrew implements a sophisticated task and project management system designed for multi-agent orchestration and human-in-the-loop workflows. The system supports two primary models: traditional projects with tasks, and agentic projects with intelligent task orchestration.

---

## 1. TASK MODEL & SCHEMA

### 1.1 Agentic Project Tasks Table Schema

**Database Table:** `agentic_project_tasks`

```sql
CREATE TABLE IF NOT EXISTS agentic_project_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agentic_project_id uuid NOT NULL REFERENCES agentic_projects(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Task identification
    task_name text NOT NULL CHECK (char_length(task_name) > 0 AND char_length(task_name) <= 255),
    task_description text,
    task_type text DEFAULT 'agent_execution' CHECK (
        task_type IN ('agent_execution', 'human_review', 'data_processing', 'integration', 'validation')
    ),
    
    -- Task status and priority
    status text DEFAULT 'pending' CHECK (
        status IN ('pending', 'queued', 'in_progress', 'waiting_dependencies', 'completed', 'failed', 'cancelled', 'skipped')
    ),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Agent assignment
    assigned_agent_id text REFERENCES agents(id) ON DELETE SET NULL,
    assigned_to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_by_agent_id text REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Task execution data
    input_payload jsonb DEFAULT '{}',
    output_payload jsonb DEFAULT '{}',
    execution_context jsonb DEFAULT '{}',
    
    -- Human-in-the-loop support
    requires_human_approval boolean DEFAULT false,
    human_approval_schema jsonb,
    human_approval_response jsonb,
    approved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    
    -- Execution tracking
    execution_order integer DEFAULT 0,
    estimated_duration_minutes integer,
    actual_duration_minutes integer,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    
    -- Timestamps
    scheduled_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    failed_at timestamptz,
    
    -- Error handling
    error_message text,
    error_details jsonb,
    
    -- Progress tracking
    progress_percentage integer DEFAULT 0,
    
    -- Audit fields
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### 1.2 Task TypeScript Interface

**Location:** `/src/types/agentic-projects.ts`

```typescript
export interface AgenticProjectTask {
  id: string;
  agentic_project_id: string;
  organization_id: string;
  task_name: string;
  task_description?: string;
  task_type: 'agent_execution' | 'human_review' | 'data_processing' | 'integration' | 'validation';
  status: 'pending' | 'queued' | 'in_progress' | 'waiting_dependencies' | 'completed' | 'failed' | 'cancelled' | 'skipped';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_agent_id?: string;
  assigned_to_user_id?: string;
  created_by_agent_id?: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  execution_context: Record<string, unknown>;
  requires_human_approval: boolean;
  human_approval_schema?: Record<string, unknown>;
  human_approval_response?: Record<string, unknown>;
  approved_by_user_id?: string;
  approved_at?: string;
  execution_order: number;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
  retry_count: number;
  max_retries: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  error_message?: string;
  error_details?: Record<string, unknown>;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}
```

### 1.3 Task Status & State Transitions

**Task Lifecycle States:**
- `pending` - Initial state, waiting to be queued
- `queued` - Queued for execution, waiting for resources
- `in_progress` - Currently executing
- `waiting_dependencies` - Blocked by prerequisite task completion
- `completed` - Successfully finished
- `failed` - Execution failed with error
- `cancelled` - User or system cancelled
- `skipped` - Task was skipped during execution

**State Transition Rules:**
```
pending → queued → in_progress → completed (on success)
                              → failed (on error, can retry)
        → waiting_dependencies → in_progress (when deps met)
        → cancelled (can occur from any state)
        → skipped (conditional execution)
```

### 1.4 Task Creation Mechanism

**Who Can Create Tasks:**
- **Users:** Via UI through task creation forms
- **Agents:** Programmatically via `useAgenticProjectTasks.createTask()`

**Task Creation Data Interface:**

```typescript
export interface TaskCreationData {
  agentic_project_id: string;
  task_name: string;
  task_description?: string;
  task_type?: AgenticProjectTask['task_type'];
  priority?: AgenticProjectTask['priority'];
  assigned_agent_id?: string;
  assigned_to_user_id?: string;
  input_payload?: Record<string, unknown>;
  execution_context?: Record<string, unknown>;
  requires_human_approval?: boolean;
  human_approval_schema?: Record<string, unknown>;
  execution_order?: number;
  estimated_duration_minutes?: number;
  max_retries?: number;
  scheduled_at?: string;
  due_date?: string;
  dependencies?: string[]; // Array of task IDs
  tags?: string[];
}
```

---

## 2. PROJECT MODEL

### 2.1 Agentic Projects Table Schema

**Database Table:** `agentic_projects`

```sql
CREATE TABLE IF NOT EXISTS agentic_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 255),
    description text,
    objectives jsonb DEFAULT '[]',
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'failed', 'cancelled')),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Project configuration
    configuration jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    
    -- Agent orchestration settings
    orchestration_config jsonb DEFAULT '{
        "max_concurrent_tasks": 5,
        "task_timeout_minutes": 30,
        "retry_policy": {
            "max_retries": 3,
            "backoff_strategy": "exponential"
        },
        "coordination_strategy": "sequential"
    }',
    
    -- Progress tracking
    progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_completion_date timestamptz,
    actual_completion_date timestamptz,
    
    -- Resource allocation
    allocated_credits numeric(12,2) DEFAULT 0.0 CHECK (allocated_credits >= 0),
    consumed_credits numeric(12,2) DEFAULT 0.0 CHECK (consumed_credits >= 0),
    
    -- Audit fields
    created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### 2.2 Project TypeScript Interface

**Location:** `/src/types/agentic-projects.ts`

```typescript
export interface AgenticProject {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  objectives: string[];
  status: 'draft' | 'active' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  configuration: Record<string, unknown>;
  metadata: Record<string, unknown>;
  orchestration_config: {
    max_concurrent_tasks: number;
    task_timeout_minutes: number;
    retry_policy: {
      max_retries: number;
      backoff_strategy: string;
    };
    coordination_strategy: string;
  };
  progress_percentage: number;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  allocated_credits: number;
  consumed_credits: number;
  created_by_user_id?: string;
  updated_by_user_id?: string;
  created_at: string;
  updated_at: string;
}
```

### 2.3 Project Lifecycle

```
draft → active → completed (on success)
              → failed (on execution failure)
              → cancelled (user cancellation)

Traits:
- Only projects in 'active' state can execute tasks
- 'draft' projects can be configured and modified
- Completed projects become read-only
```

### 2.4 Project-to-Task Relationship

```
agentic_projects (1) ──── (N) agentic_project_tasks
                     │
                     └─ Foreign Key: agentic_project_id
                     └─ Cascade DELETE on project deletion
                     └─ Supports multi-task project structures
```

**Multi-Task Project Example:**
```
Project: "Content Creation Pipeline"
├── Task 1: Generate Draft Content (agent_execution)
├── Task 2: Review Draft (human_review) [depends on Task 1]
├── Task 3: SEO Optimization (agent_execution) [depends on Task 2]
└── Task 4: Publish (integration) [depends on Task 3]
```

### 2.5 Agent Project Creation

**Can Agents Create Projects?** YES
- Agents can programmatically create agentic projects via the service layer
- Projects created by agents inherit agent orchestration constraints
- Agents can assign themselves tasks within projects

---

## 3. TASK CREATION FLOW

### 3.1 Task Creation Hook

**Location:** `/src/hooks/useAgenticProjectTasks.ts`

```typescript
const createTask = useCallback(async (taskData: TaskCreationData): Promise<AgenticProjectTask> => {
  // 1. Validate user organization context
  // 2. Escape and prepare data for SQL execution
  // 3. Execute INSERT via execute_sql RPC function
  // 4. Return created task
  // 5. Update local state
}, [userProfile]);
```

**Key Properties:**
- Validates organization context before task creation
- Uses SQL injection protection via string escaping
- Automatically timestamps task creation
- Associates task with creating agent/user
- Supports JSON payloads for input/execution data

### 3.2 API Endpoint: Task Creation

**Edge Function:** `/supabase/functions/task-create/index.ts`

**Endpoint Structure:**
```typescript
POST /functions/v1/task-create
Content-Type: application/json

Request Body:
{
  projectId: string;           // Required
  taskType: string;            // Required: 'agent_execution', 'human_review', etc.
  title: string;               // Required
  description?: string;
  inputPayload: Record<string, unknown>; // Required
  assignedAgentTypeId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
  requiresHitl?: boolean;      // Require human-in-the-loop approval
}

Response:
{
  task: {
    id: string;
    project_id: string;
    task_type: string;
    title: string;
    status: 'pending';
    priority: string;
    input_payload: Record<string, unknown>;
    requires_hitl: boolean;
    created_at: string;
    updated_at: string;
  };
  message: string;
}
```

### 3.3 Task Creation from UI vs. Agents

**From UI (User Initiated):**
1. User opens task creation form in TaskManagementPage
2. Form validates required fields
3. Calls `createTask()` from `useTaskManagement` hook
4. Hook invokes `task-create` Edge Function
5. Task stored with `created_by: user.id`
6. User receives toast notification on success/failure

**From Agents (Programmatic):**
1. Agent logic executes `useAgenticProjectTasks.createTask()`
2. Agent provides TaskCreationData
3. Hook uses `execute_sql` RPC for direct database insertion
4. Task stored with `created_by_agent_id: agent.id`
5. Created task returned for immediate use

### 3.4 Task Creation Validation & Permissions

**Required Fields:**
- `agentic_project_id` - Must exist and belong to user's organization
- `task_name` - Non-empty, max 255 characters
- `task_type` - Valid enum value
- Organization context from JWT

**Permissions:**
- Users can only create tasks in their organization
- Users must have read access to the target project
- Row-level security enforces organization isolation
- Agents inherit organization from deployment context

**Validation Flow:**
```
Input Validation
    ↓
Organization Check (RLS)
    ↓
Project Existence Check
    ↓
Payload Sanitization
    ↓
Database Insert
    ↓
Task Interaction Log
    ↓
Notification Creation (if HITL)
```

---

## 4. APPROVAL WORKFLOW

### 4.1 Approval UI Component

**Location:** `/src/components/content/HITLReviewInterface.tsx`

**Features:**
- JSON data viewer for task payloads
- Processing result status display
- Approve/Reject tabbed interface
- Reviewer comments textarea
- Edit mode for content modification
- Status badge indicators

**Approval States:**
- Processing (in progress)
- Completed (ready for review)
- Failed (display error message)
- Queued (waiting to start)

### 4.2 Task Approval Modal

**Location:** `/src/pages/tenant/MyTasksPage.tsx` (TaskApprovalModal component)

**UI Elements:**
```typescript
<TaskApprovalModal>
  ├── Task Details Section
  │   ├── Task name & description
  │   ├── Task type badge
  │   ├── Priority badge
  │   ├── Input payload viewer
  │   └── Approval schema display
  │
  ├── Approval/Rejection Tabs
  │   ├── Approve Tab
  │   │   ├── JSON response editor
  │   │   └── Approve button
  │   │
  │   └── Reject Tab
  │       ├── Reason textarea
  │       └── Reject button
  │
  └── Footer Actions
      ├── Cancel button
      └── Approve/Reject buttons
```

### 4.3 Approval States & Transitions

**Approval State Machine:**

```
Task Created (requires_human_approval = true)
    ↓
pending (waiting_dependencies resolved)
    ↓
waiting_approval (status = 'in_progress', approved_by_user_id = null)
    ↓
    ├─→ APPROVED → in_progress (continue execution)
    │              human_approval_response = {...}
    │              approved_by_user_id = user.id
    │              approved_at = now()
    │
    └─→ REJECTED → failed
                  error_message = "Rejected by user: {reason}"
                  approved_by_user_id = user.id
                  approved_at = now()
```

**Key Fields in Approval Response:**
```typescript
human_approval_response: {
  approved: boolean;
  comments: string;
  feedback?: Record<string, unknown>;
  [customField: string]: unknown;  // Schema-dependent
}
```

### 4.4 Can Agents Proceed Without Approval?

**Default Behavior:** NO
- Tasks with `requires_human_approval = true` block agent execution
- Task status transitions to `in_progress` but waits for user response
- Agent cannot modify task without explicit approval

**Exception Flow:**
- If task times out without approval, auto-reject with timeout error
- System can skip approval for dev/test environments (config-dependent)
- Approval can be pre-defined in `human_approval_schema` with default values

### 4.5 Comment/Feedback & Revision Requests

**Comment Mechanism:**
- Reviewer can add comments in `reviewer_comments` field
- Comments stored in `human_approval_response` JSON
- Supports multi-line feedback and structured feedback

**Revision Handling:**
```typescript
if (responseType === 'modification') {
  // Mark task for revision
  status = 'pending';  // Re-queue for execution
  feedback = {...};
} else if (responseType === 'rejection') {
  status = 'failed';
  error_message = reason;
}
```

---

## 5. SCHEDULING SYSTEM

### 5.1 Scheduled Task Storage

**Field Location:** `agentic_project_tasks.scheduled_at`

```typescript
scheduled_at?: string;  // ISO 8601 timestamp
due_date?: string;      // ISO 8601 timestamp (for display)
```

**Scheduling Data:**
```typescript
// When creating a task
{
  scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),  // 24 hours from now
  due_date: "2025-12-20T18:00:00Z"
}
```

### 5.2 Scheduled Task Triggering

**Implementation:** Background job processing

**Trigger Mechanism:**
```sql
-- Webhook processor cron (see migration: 20250107_webhook_processor_cron.sql)
-- Runs periodically to check scheduled_at timestamps
SELECT * FROM agentic_project_tasks 
WHERE scheduled_at IS NOT NULL 
  AND scheduled_at <= now()
  AND status = 'pending';
```

**Processing Flow:**
```
Cron Job (5-minute intervals)
    ↓
Query pending scheduled tasks
    ↓
For each task where scheduled_at <= now():
    ├─ Update status: pending → queued
    ├─ Update started_at = now()
    ├─ Check dependencies
    │   ├─ If deps satisfied → in_progress
    │   └─ If deps pending → waiting_dependencies
    └─ Trigger execution or notification
```

### 5.3 Agent Task Scheduling

**Can Agents Schedule Follow-up Tasks?** YES

```typescript
// Agent creates follow-up task
const followUpTask = await createTask({
  agentic_project_id: currentProject.id,
  task_name: "Follow-up Analysis",
  scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),  // 1 week
  dependencies: [currentTaskId]  // Depends on this task
});
```

**Scheduling Implementation:**
```typescript
// In useAgenticProjectTasks.createTask()
scheduled_at: ${taskData.scheduled_at ? `'${taskData.scheduled_at}'` : 'null'}
```

### 5.4 Job Queue Architecture

**Implementation:** Supabase Edge Functions + Webhooks

```typescript
// Post-task completion hook
if (task.status === 'completed') {
  // Check for any scheduled tasks dependent on this task
  const dependents = await fetchScheduledDependents(taskId);
  
  for (const dependent of dependents) {
    if (dependent.scheduled_at <= now()) {
      // Queue for immediate execution
      await queueTaskExecution(dependent.id);
    } else {
      // Update to waiting_dependencies resolved
      await updateTask(dependent.id, {
        status: 'queued'
      });
    }
  }
}
```

---

## 6. TASK MANAGEMENT UI

### 6.1 Task List Component

**Location:** `/src/components/playground/TaskList.tsx`

**Features:**
- Search & filter capabilities
- Status-based filtering (pending, in_progress, completed, etc.)
- Priority-based filtering
- Tag-based filtering
- Progress bar visualization
- Assignment indicators (user vs. agent)
- Due date display

### 6.2 Task Detail View

**Components Involved:**
- Task card with status icon
- Metadata display (created date, assignee, duration)
- Progress percentage with bar
- Tag display with overflow handling
- Action dropdown menu (View, Edit, Delete)

### 6.3 Task Creation Form

**Location:** `/src/components/projects/ProjectCreationForm.tsx` (related)

**Form Fields:**
```typescript
{
  task_name: string;           // Text input
  task_description: string;    // Textarea
  task_type: select;          // Dropdown
  priority: select;           // Dropdown
  assigned_agent_id?: select; // Optional dropdown
  execution_order: number;    // Numeric input
  estimated_duration_minutes: number;
  requires_human_approval: checkbox;
  input_payload: JSON editor; // Code editor
}
```

### 6.4 Project Management Interface

**Location:** `/src/pages/AgenticProjects.tsx` (referenced in docs)

**Key Views:**
1. **Project List** - Card grid showing all projects with stats
2. **Project Overview** - Dashboard with tasks, progress, timeline
3. **Project Settings** - Configuration, team, orchestration settings
4. **Project Crew** - Agent assignments and collaboration
5. **Project Assets** - Uploaded files and resources
6. **Project Tasks** - Kanban board, task list, workflow visualization

### 6.5 My Tasks & Approvals Page

**Location:** `/src/pages/tenant/MyTasksPage.tsx`

**Tabs:**
1. **Pending Approval** - Tasks requiring human review
   - Shows alert indicator for approval-required tasks
   - Displays approval button in card
2. **In Progress** - Tasks being executed
   - Shows assigned agent/user
   - Progress indicators
3. **Completed** - Finished tasks
   - Success/failure indicators
   - Completion timestamp

**Features:**
- Task statistics (counts by status)
- Task approval modal with JSON editor
- Rejection reason collection
- Task refresh on approval/rejection

---

## 7. DATA FLOW DIAGRAMS

### 7.1 Task Creation Flow

```
User/Agent
    ↓
Task Creation Form / useAgenticProjectTasks.createTask()
    ↓
Validation (organization, project, required fields)
    ↓
useAgenticProjectTasks (hook)
    ├─ Prepare data with escaping
    ├─ execute_sql RPC call
    └─ INSERT INTO agentic_project_tasks
    ↓
Task Interaction Log
    ├─ Log interaction_type = 'task_created'
    ├─ Actor = user/agent
    └─ Timestamp creation
    ↓
IF requires_human_approval:
    ├─ Create HITL notification
    └─ Set status = 'in_progress'
ELSE:
    ├─ Queue task
    └─ Check dependencies
    ↓
Update UI / Local State
    ↓
Return created task
```

### 7.2 Approval Workflow

```
User Views "My Tasks & Approvals"
    ↓
fetchTasksForUser() - SQL query:
    SELECT * FROM agentic_project_tasks
    WHERE requires_human_approval = true 
      AND approved_by_user_id IS NULL
    ↓
Display TaskCards with "Review & Approve" button
    ↓
User Clicks "Review & Approve"
    ↓
TaskApprovalModal Opens
    ├─ Display task details
    ├─ Show input_payload
    ├─ Show human_approval_schema
    └─ Show existing human_approval_response
    ↓
User Chooses Action:
    ├─ APPROVE:
    │   └─ approveTask(taskId, response)
    │       ├─ updateTask with:
    │       │   ├─ status = 'in_progress'
    │       │   ├─ human_approval_response = {...}
    │       │   ├─ approved_by_user_id = user.id
    │       │   └─ approved_at = now()
    │       └─ Toast success notification
    │
    └─ REJECT:
        └─ rejectTask(taskId, reason)
            ├─ updateTask with:
            │   ├─ status = 'failed'
            │   ├─ error_message = "Rejected: {reason}"
            │   ├─ approved_by_user_id = user.id
            │   └─ approved_at = now()
            └─ Toast success notification
    ↓
Modal Closes
    ↓
Refresh Task List
```

### 7.3 Execution Pipeline with Dependencies

```
Task Creation with Dependencies
    ↓
INSERT INTO agentic_project_tasks (status = 'pending')
    ↓
INSERT INTO agentic_task_dependencies
    ├─ dependent_task_id = new_task.id
    └─ prerequisite_task_id = parent_task.id
    ↓
Check Prerequisites:
    ├─ IF all prerequisites complete:
    │   └─ Update status = 'queued'
    └─ ELSE:
        └─ Update status = 'waiting_dependencies'
    ↓
Prerequisite Task Completes
    ↓
Trigger: Check for dependent tasks
    ├─ Query tasks with waiting_dependencies
    ├─ Check if all prerequisites done
    └─ Update status = 'queued'
    ↓
Task Execution Begins
    ├─ Update status = 'in_progress'
    ├─ Update started_at = now()
    ├─ Execute task logic
    └─ If requires_human_approval:
        └─ Pause and wait for approval
```

---

## 8. COMPLETE CODE EXAMPLES

### 8.1 Create Task Example

```typescript
// From MyTasksPage or any component
import { useAgenticProjectTasks } from '@/hooks/useAgenticProjectTasks';

const MyComponent = () => {
  const { createTask, approveTask, rejectTask } = useAgenticProjectTasks();

  const handleCreateTask = async () => {
    try {
      const newTask = await createTask({
        agentic_project_id: projectId,
        task_name: "SEO Optimization",
        task_description: "Optimize content for search engines",
        task_type: "agent_execution",
        priority: "high",
        assigned_agent_id: agentId,
        requires_human_approval: false,
        input_payload: {
          content_id: contentId,
          target_keywords: ['AI', 'automation'],
          tone: 'technical'
        },
        execution_order: 2,
        max_retries: 3
      });
      
      console.log('Task created:', newTask.id);
      toast.success('Task created successfully');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  return <button onClick={handleCreateTask}>Create Task</button>;
};
```

### 8.2 Approve Task Example

```typescript
const handleApprove = async (response: Record<string, unknown>) => {
  if (!selectedTask) return;
  
  try {
    await approveTask(selectedTask.id, response);
    
    // approveTask internally calls updateTask with:
    // {
    //   status: 'in_progress',
    //   human_approval_response: response,
    //   approved_by_user_id: userProfile.id
    // }
    
    toast.success('Task approved successfully');
    setSelectedTask(null);
    fetchTasksForUser(); // Refresh
  } catch (error) {
    console.error('Error approving task:', error);
    toast.error('Failed to approve task');
  }
};
```

### 8.3 Task Rejection Example

```typescript
const handleReject = async (reason: string) => {
  if (!selectedTask) return;
  
  try {
    await rejectTask(selectedTask.id, reason);
    
    // rejectTask internally calls updateTask with:
    // {
    //   status: 'failed',
    //   error_message: `Rejected by user: ${reason}`,
    //   human_approval_response: { rejected: true, reason },
    //   approved_by_user_id: userProfile.id
    // }
    
    toast.success('Task rejected');
    setSelectedTask(null);
    fetchTasksForUser(); // Refresh
  } catch (error) {
    console.error('Error rejecting task:', error);
    toast.error('Failed to reject task');
  }
};
```

### 8.4 Schedule Task Example

```typescript
const handleScheduleTask = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
  
  await createTask({
    agentic_project_id: projectId,
    task_name: "Daily Report Generation",
    task_type: "data_processing",
    priority: "medium",
    scheduled_at: tomorrow.toISOString(),  // Scheduled for later
    requires_human_approval: true,
    input_payload: {
      report_type: 'daily',
      date_range: 'yesterday'
    }
  });
};
```

---

## 9. KEY API ENDPOINTS

### 9.1 Task Creation Endpoint
**POST** `/functions/v1/task-create`
- Requires authentication
- Returns created task object

### 9.2 Task Update Endpoint
**POST** `/functions/v1/task-update`
- Body: `{ task_id, updates: {...} }`
- Updates task fields

### 9.3 HITL Request Endpoint
**POST** `/functions/v1/task-request-hitl`
- Initiates human-in-the-loop workflow
- Creates notification for assigned user
- Sets task status to pending approval

---

## 10. COMPLETE FILE STRUCTURE

```
src/
├── types/
│   ├── agentic-projects.ts          # All agentic project/task interfaces
│   └── management.ts                # Management UI types
│
├── hooks/
│   ├── useAgenticProjectTasks.ts    # Task CRUD operations
│   ├── useAgenticProjects.ts        # Project CRUD operations
│   └── useTaskManagement.ts         # Legacy task management
│
├── services/
│   └── agenticProjectsService.ts    # Service layer for projects
│
├── components/
│   ├── content/
│   │   └── HITLReviewInterface.tsx  # Approval/review UI
│   │
│   ├── playground/
│   │   └── TaskList.tsx             # Task list display
│   │
│   └── projects/
│       └── AgenticProjectSelector.tsx
│
├── pages/
│   ├── tenant/
│   │   └── MyTasksPage.tsx          # Approval page with modal
│   │
│   └── TaskManagementPage.tsx       # Task dashboard & Kanban
│
└── integrations/
    └── supabase/
        └── client.ts                # Supabase client config

supabase/
├── migrations/
│   └── 20250528000000_create_agentic_projects_schema.sql
│
└── functions/
    ├── task-create/
    │   └── index.ts
    │
    ├── task-request-hitl/
    │   └── index.ts
    │
    └── ... (50+ other functions)
```

---

## 11. SECURITY & PERMISSIONS

### 11.1 Row-Level Security (RLS) Policies

All agentic_project_* tables have RLS enabled:
- Users can ONLY view/create/update tasks in their organization
- Organization check via: `organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())`
- Prevents cross-organization data access

### 11.2 Task Creation Permissions

**Required:**
- User must be authenticated (auth.uid())
- User must have active organization context
- User organization must match task organization_id

**Optional:**
- Agent assignment requires agent to exist in system
- User assignment requires user in same organization

---

## 12. WORKFLOW SUMMARY

**Complete Task Lifecycle:**

1. **Creation** → Task created with status='pending'
2. **Validation** → Check dependencies, org context
3. **Queuing** → If no deps, move to queued
4. **Execution** → Agent/system executes task
5. **HITL Check** → If requires_human_approval=true, pause
6. **Approval** → User reviews and approves/rejects
7. **Completion** → Task marked complete with results
8. **Cleanup** → Trigger dependent task execution

**Key Differences from Traditional Projects:**
- Agentic projects support agent-created tasks
- Orchestration config controls execution strategy
- Dependencies are first-class concept (not just ordering)
- Built-in human-in-the-loop approval workflow
- Task progress and execution metrics tracked

---

## 13. TROUBLESHOOTING & COMMON ISSUES

### Issue: Task Not Executing After Approval
**Cause:** Dependencies not satisfied
**Solution:** Check `agentic_task_dependencies` table, ensure all prerequisite tasks are completed

### Issue: Scheduled Task Not Running
**Cause:** Cron job not triggered or scheduled_at in future
**Solution:** Check webhook processor is running, verify scheduled_at timestamp

### Issue: HITL Notification Not Sent
**Cause:** Task created with requires_human_approval=true but notification disabled
**Solution:** Check user_notifications table, verify notification preferences

---
