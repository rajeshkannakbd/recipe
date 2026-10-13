namespace RecipePro.Api.DTOs.Recipe;

public class RecipeProcedureResponse
{
    public int StepNumber { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
}