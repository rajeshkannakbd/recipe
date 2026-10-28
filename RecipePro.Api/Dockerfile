
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY RecipePro.Api/MyApi.csproj ./RecipePro.Api/
WORKDIR /src/RecipePro.Api
RUN dotnet restore MyApi.csproj

COPY RecipePro.Api/ ./
RUN dotnet publish MyApi.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "MyApi.dll"]
