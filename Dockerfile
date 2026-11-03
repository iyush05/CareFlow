FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY src/CareFlow.Api/CareFlow.Api.csproj src/CareFlow.Api/
RUN dotnet restore src/CareFlow.Api/CareFlow.Api.csproj
COPY src/CareFlow.Api src/CareFlow.Api
RUN dotnet publish src/CareFlow.Api/CareFlow.Api.csproj -c Release -o /app --no-restore
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "CareFlow.Api.dll"]
