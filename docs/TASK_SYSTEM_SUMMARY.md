# Task & Project Management System - CRITICAL FINDINGS SUMMARY

## LOCATION OF COMPLETE DOCUMENTATION
Full documentation has been saved to: `/tmp/task_management_documentation.md` (29 sections, 2000+ lines)

---

## CRITICAL FILE LOCATIONS

### Database & Schema
- **Primary Migration:** `/supabase/migrations/20250528000000_create_agentic_projects_schema.sql`
- **Type Definitions:** `/src/types/agentic-projects.ts`
- **Management Types:** `/src/types/management.ts`

### Task Management Hooks
- **Agentic Tasks:** `/src/hooks/useAgenticProjectTasks.ts` (COMPLETE implementation)
- **Projects:** `/src/hooks/useAgenticProjects.ts`
- **Legacy Tasks:** `/src/hooks/useTaskManagement.ts`

### Services
- **Agentic Projects Service:** `/src/services/agenticProjectsService.ts`

### UI Components
- **Approval Interface:** `/src/components/content/HITLReviewInterface.tsx`
- **My Tasks Page:** `/src/pages/tenant/MyTasksPage.tsx` (with TaskApprovalModal)
- **Task Management Dashboard:** `/src/pages/TaskManagementPage.tsx`
- **Task List:** `/src/components/playground/TaskList.tsx`

### API Endpoints (Supabase Edge Functions)
- **Task Creation:** `/supabase/functions/task-create/index.ts`
- **HITL Request:** `/supabase/functions/task-request-hitl/index.ts`
- **Task Update:** `/supabase/functions/task-update/index.ts`
- **Cron/Scheduling:** `/supabase/migrations/20250107_webhook_processor_cron.sql`

---

## KEY FINDINGS

### 1. TASK MODEL COMPLETE
- **8 Status States:** pending, queued, in_progress, waiting_dependencies, completed, failed, cancelled, skipped
- **5 Task Types:** agent_execution, human_review, data_processing, integration, validation
- **Priority Levels:** low, medium, high, urgent
- **Full Approval Support:** requires_human_approval boolean + human_approval_schema for conditional approvals
- **Progress Tracking:** progress_percentage, estimated/actual_duration_minutes
- **Error Handling:** error_message and error_details JSON fields

### 2. PROJECT MODEL COMPLETE
- **5 Project States:** draft, active, completed, failed, cancelled
- **Multi-Task Support:** One project can contain unlimited tasks with dependency ordering
- **Orchestration Config:** max_concurrent_tasks, task_timeout_minutes, retry_policy, coordination_strategy
- **Resource Tracking:** allocated_credits and consumed_credits
- **Can Agents Create Projects?** YES - via AgenticProjectsService.createProject()

### 3. TASK CREATION MECHANISM
**Who Creates:**
- Users: Via TaskManagementPage UI form
- Agents: Programmatically via useAgenticProjectTasks.createTask()

**Creation Flow:**
1. Hook validates organization context
2. SQL injection protection via string escaping
3. INSERT via execute_sql RPC function
4. Task interaction log created
5. If requires_human_approval: Create notification & HITL workflow

### 4. APPROVAL WORKFLOW (CRITICAL)
**Approval States:**
```
Task pending → waiting_approval (in_progress, no approval yet)
            → APPROVED: in_progress + human_approval_response stored
            → REJECTED: failed + error_message + rejection reason
```

**Can Agents Bypass?** NO - requires_human_approval = true blocks execution
- Task pauses in "in_progress" state
- Must wait for user to approve/reject
- Approval stored in human_approval_response JSON

**UI:** TaskApprovalModal with tabs for Approve/Reject
- Shows input_payload
- Shows human_approval_schema
- Collects reviewer comments
- JSON response editor for structured approval data

### 5. SCHEDULING SYSTEM
**Storage:** `agentic_project_tasks.scheduled_at` (ISO 8601 timestamp)

**Triggering:** Webhook processor cron (checks every ~5 minutes)
- Queries: WHERE scheduled_at <= NOW() AND status = 'pending'
- Updates: pending → queued → in_progress

**Agent Scheduling:** Agents CAN schedule follow-up tasks
- Specify scheduled_at when creating task
- Supports dependency chains (task1 completes → task2 scheduled)

### 6. TASK DEPENDENCIES
**Storage:** `agentic_task_dependencies` table
- Types: blocking, optional, parallel, conditional
- Supports condition_expression for conditional deps

**Execution:**
- pending + deps satisfied → queued
- pending + deps pending → waiting_dependencies
- When prerequisite completes → dependent status updated to queued

### 7. CRITICAL FEATURES
- **Multi-Agent Orchestration:** Agents can create projects & tasks
- **Human-in-Loop:** Built-in approval workflow with schema-based validation
- **Scheduling:** Cron-based task scheduling with dependency support
- **Progress Tracking:** Real-time progress_percentage updates
- **Error Handling:** Comprehensive error_message + error_details + retry logic
- **RLS Security:** Organization isolation via Row-Level Security
- **Audit Trail:** created_by_user_id/agent_id, created_at, updated_at timestamps

---

## COMPLETE SCHEMA SUMMARY

### MAIN TABLES
1. **agentic_projects** - Project container (1:N with tasks)
2. **agentic_project_tasks** - Individual tasks with full lifecycle
3. **agentic_task_dependencies** - Task dependency graph
4. **agentic_task_progress** - Real-time progress tracking
5. **agentic_task_execution_logs** - Execution logs with phases
6. **agentic_project_collaborations** - Agent role & permissions

### KEY CONSTRAINTS
- Tasks require project + organization context
- Self-referencing prevented in dependencies
- Status/priority enums strictly enforced
- Completion requires actual_completion_date
- Failed tasks require failed_at timestamp

---

## QUICK REFERENCE: API EXAMPLES

### Create Task with HITL
```typescript
const task = await createTask({
  agentic_project_id: "uuid",
  task_name: "Review Content",
  task_type: "human_review",
  requires_human_approval: true,
  human_approval_schema: {
    type: "form",
    fields: [
      { name: "approved", type: "checkbox", label: "Approve?" }
    ]
  },
  input_payload: { content_id: "..." }
});
```

### Approve Task
```typescript
await approveTask(taskId, {
  approved: true,
  comments: "Looks good to proceed"
});
```

### Schedule Task
```typescript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

await createTask({
  agentic_project_id: "uuid",
  task_name: "Scheduled Report",
  scheduled_at: tomorrow.toISOString(),
  dependencies: [previousTaskId]
});
```

---

## IMPORTANT IMPLEMENTATION NOTES

1. **No Standard SQL:** Uses execute_sql RPC function for direct queries
   - Include SQL injection protection (string escaping)
   - Location: `/supabase/functions/execute_sql/index.ts`

2. **Edge Function Middleware:** All functions use withAuth middleware
   - Validates JWT claims
   - Extracts user.id and organization_id

3. **Notification System:** Integrated with user_notifications table
   - Triggered on task creation (if HITL)
   - Triggered on HITL request
   - Shows in user UI as alerts

4. **No Explicit Job Queue:** Uses webhook processor + cron
   - Not a traditional job queue (Celery, RQ, etc.)
   - Relies on Supabase edge function scheduler

5. **Local State Management:** Hooks use useState for optimistic updates
   - Real database is source of truth
   - UI updates immediately with local state
   - Re-sync on error

---

## SECURITY CONSIDERATIONS

- **RLS Policies:** All tables have organization-level RLS
- **SQL Injection:** Protected via string escaping in hooks
- **Authentication:** Required via JWT (auth.uid())
- **Authorization:** User organization must match resource organization
- **Data Isolation:** Strict organization boundaries enforced at DB level

---

## COMPLETE DOCUMENTATION
See: `/tmp/task_management_documentation.md` for:
- Section 7: Complete data flow diagrams
- Section 8: Full code examples
- Section 10: Complete file structure
- Section 13: Troubleshooting guide
