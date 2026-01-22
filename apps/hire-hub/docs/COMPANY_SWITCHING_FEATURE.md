# Company Switching Feature for Recruiters

## Overview

This feature allows recruiters to work with multiple companies by switching between them. The active company is stored in the user's profile and automatically used in job-related operations.

## Database Changes

### User Schema

Added `activeCompanyId` field to track the recruiter's currently selected company:

```typescript
activeCompanyId: {
  type: Schema.Types.ObjectId,
  ref: 'Company',
  required: false,
  index: true,
}
```

## API Endpoints

### 1. Get My Companies

**Query:** `getMyCompanies`

Returns all companies where the user is owner or recruiter.

```graphql
query GetMyCompanies {
	getMyCompanies {
		_id
		name
		logoUrl
		verified
		role # "owner" or "recruiter"
		industry
		size
	}
}
```

**Response:**

```json
[
	{
		"_id": "676e7b49b9f432a1c86ac8e1",
		"name": "Google",
		"logoUrl": "https://...",
		"verified": true,
		"role": "owner",
		"industry": "Technology",
		"size": "10000+"
	},
	{
		"_id": "676e7b49b9f432a1c86ac8e2",
		"name": "Meta",
		"logoUrl": "https://...",
		"verified": true,
		"role": "recruiter",
		"industry": "Technology",
		"size": "10000+"
	}
]
```

### 2. Switch Active Company

**Mutation:** `switchActiveCompany`

Switches the recruiter's active company. Validates that the user has access to the company.

```graphql
mutation SwitchCompany($input: SwitchCompanyInput!) {
	switchActiveCompany(input: $input) {
		_id
		firstName
		lastName
		email
		role
		activeCompanyId
		message
	}
}
```

**Variables:**

```json
{
	"input": {
		"companyId": "676e7b49b9f432a1c86ac8e2"
	}
}
```

**Response:**

```json
{
	"_id": "676e7b49b9f432a1c86ac8d0",
	"firstName": "John",
	"lastName": "Doe",
	"email": "john@example.com",
	"role": "RECRUITER",
	"activeCompanyId": "676e7b49b9f432a1c86ac8e2",
	"message": "Active company switched successfully"
}
```

### 3. Get Active Company

**Query:** `getActiveCompany`

Returns the current active company details.

```graphql
query GetActiveCompany {
	getActiveCompany {
		_id
		name
		logoUrl
		verified
		industry
		size
		location {
			city
			region
			country
		}
	}
}
```

## Using the ActiveCompany Decorator

### Option 1: Using ActiveCompany Decorator (Recommended for Recruiters)

The `@ActiveCompany()` decorator automatically injects the active company ID from the authenticated user:

```typescript
import { ActiveCompany } from '../auth/decorators/activeCompany.decorator';

@Roles(UserRole.RECRUITER)
@UseGuards(RolesGuard)
@UseGuards(AuthGuard)
@Mutation(() => JobOutput)
async createJob(
  @Args('input') input: Omit<CreateJobInput, 'companyId'>,
  @ActiveCompany() companyId: string,
  @AuthUser('_id') userId: string,
): Promise<JobOutput> {
  // companyId is automatically injected from user.activeCompanyId
  return this.jobService.createJob({ ...input, companyId }, userId);
}
```

**Benefits:**

- ✅ No need to pass `companyId` in the input
- ✅ Automatic validation that user has access to the company
- ✅ Cleaner frontend code - just select company once
- ✅ Prevents accidental cross-company operations

**GraphQL Mutation (No companyId needed):**

```graphql
mutation CreateJob($input: CreateJobInput!) {
	createJob(input: $input) {
		_id
		title
		companyId
	}
}
```

### Option 2: Traditional Approach (For Admin/Owner)

For admins or when explicitly specifying a company:

```typescript
@Mutation(() => JobOutput)
async createJob(
  @Args('input') input: CreateJobInput,
  @AuthUser('_id') userId: string,
): Promise<JobOutput> {
  return this.jobService.createJob(input, userId);
}
```

## Frontend Implementation

### React Example with Context

```typescript
// CompanyContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';

interface Company {
  _id: string;
  name: string;
  logoUrl?: string;
  verified: boolean;
  role: 'owner' | 'recruiter';
}

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  switchCompany: (companyId: string) => Promise<void>;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC = ({ children }) => {
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  const { data: companiesData, loading: companiesLoading } = useQuery(GET_MY_COMPANIES);
  const { data: activeData } = useQuery(GET_ACTIVE_COMPANY);
  const [switchCompanyMutation] = useMutation(SWITCH_COMPANY);

  useEffect(() => {
    if (activeData?.getActiveCompany) {
      setActiveCompany(activeData.getActiveCompany);
    }
  }, [activeData]);

  const switchCompany = async (companyId: string) => {
    const { data } = await switchCompanyMutation({
      variables: { input: { companyId } }
    });

    if (data?.switchActiveCompany) {
      // Refresh the page or update context
      window.location.reload();
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        companies: companiesData?.getMyCompanies || [],
        activeCompany,
        switchCompany,
        loading: companiesLoading
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useCompany must be used within CompanyProvider');
  return context;
};
```

### Company Selector Component

```typescript
// CompanySelector.tsx
import React from 'react';
import { useCompany } from './CompanyContext';

export const CompanySelector: React.FC = () => {
  const { companies, activeCompany, switchCompany, loading } = useCompany();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="company-selector">
      <select
        value={activeCompany?._id || ''}
        onChange={(e) => switchCompany(e.target.value)}
        className="form-select"
      >
        {!activeCompany && (
          <option value="">Select a company...</option>
        )}
        {companies.map((company) => (
          <option key={company._id} value={company._id}>
            {company.verified && '✓ '} {company.name} ({company.role})
          </option>
        ))}
      </select>

      {activeCompany && (
        <div className="active-company-info">
          {activeCompany.logoUrl && (
            <img src={activeCompany.logoUrl} alt={activeCompany.name} />
          )}
          <span>{activeCompany.name}</span>
          {activeCompany.verified && <span className="badge">Verified</span>}
        </div>
      )}
    </div>
  );
};
```

### GraphQL Queries

```typescript
// queries.ts
import { gql } from '@apollo/client';

export const GET_MY_COMPANIES = gql`
	query GetMyCompanies {
		getMyCompanies {
			_id
			name
			logoUrl
			verified
			role
			industry
			size
		}
	}
`;

export const GET_ACTIVE_COMPANY = gql`
	query GetActiveCompany {
		getActiveCompany {
			_id
			name
			logoUrl
			verified
			industry
			size
		}
	}
`;

export const SWITCH_COMPANY = gql`
	mutation SwitchCompany($input: SwitchCompanyInput!) {
		switchActiveCompany(input: $input) {
			_id
			activeCompanyId
			message
		}
	}
`;
```

## User Flow

1. **User logs in** as a recruiter
2. **Check active company:** Call `getActiveCompany` query
3. **If no active company:** Show company selector with all available companies
4. **User selects company:** Call `switchActiveCompany` mutation
5. **Store in context/state:** Update UI to reflect selected company
6. **All operations:** Automatically use the active company (no need to pass companyId)
7. **Switch anytime:** User can change company via dropdown in navbar

## Error Handling

### No Active Company Set

```json
{
	"message": "No active company selected. Please select a company first using the switchActiveCompany mutation.",
	"statusCode": 401
}
```

### No Access to Company

```json
{
	"message": "You don't have access to company with ID \"676e7b49b9f432a1c86ac8e2\"",
	"statusCode": 404
}
```

### Not a Recruiter

```json
{
	"message": "Only recruiters can use this endpoint",
	"statusCode": 401
}
```

## Migration Notes

### Existing Recruiters

- Existing users will have `activeCompanyId: null`
- On first login, prompt them to select a company
- Default to their first company if they only have one

### Backward Compatibility

- Keep the old `companyId` parameter in inputs for admin users
- Allow either `activeCompanyId` or explicit `companyId` in service methods
- Gradually migrate endpoints to use `@ActiveCompany()` decorator

## Security Considerations

1. **Validation:** The decorator validates user has access before injecting company ID
2. **Role checking:** Only RECRUITER role can use company switching
3. **Audit logging:** Log all company switches for security audit
4. **JWT refresh:** Token includes activeCompanyId, so it's always in sync

## Testing

### Unit Tests

```typescript
describe('UserService - Company Switching', () => {
  it('should return all companies where user is owner or recruiter', async () => {
    const companies = await userService.getMyCompanies(userId);
    expect(companies).toHaveLength(2);
    expect(companies[0].role).toBe('owner');
  });

  it('should switch active company successfully', async () => {
    const result = await userService.switchActiveCompany(userId, companyId);
    expect(result.activeCompanyId).toBe(companyId);
  });

  it('should throw error if user has no access to company', async () => {
    await expect(
      userService.switchActiveCompany(userId, unauthorizedCompanyId)
    ).rejects.toThrow('You don\\'t have access to company');
  });
});
```

## Benefits

✅ **Better UX:** Select company once, work seamlessly  
✅ **Cleaner Code:** No need to pass companyId in every request  
✅ **Security:** Automatic validation of company access  
✅ **Audit Trail:** Track which company recruiter is working with  
✅ **Flexibility:** Easy to switch between multiple companies  
✅ **Type Safety:** TypeScript ensures proper typing throughout
