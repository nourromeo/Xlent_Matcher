namespace XlentMatch.Api.Models;

public enum RequirementType
{
    Mandatory = 1,
    Desired = 2
}

public enum SeniorityMatchMode
{
    Exact = 1,
    Minimum = 2,
    Range = 3
}

public enum AssignmentStatus
{
    Draft = 1,
    Matching = 2, // Legacy database value

    Matched = 3,
    Closed = 4 // Legacy database value
}
