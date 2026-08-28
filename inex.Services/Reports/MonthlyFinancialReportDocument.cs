using System.Globalization;
using inex.Services.Models.Records.Report;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace inex.Services.Reports;

public sealed class MonthlyFinancialReportDocument : IDocument
{
    private const string HeaderColor = "1D4ED8";
    private const string AccentColor = "2563EB";
    private const string PositiveColor = "047857";
    private const string NegativeColor = "B91C1C";
    private const string MutedColor = "6B7280";
    private const string BorderColor = "E5E7EB";

    public MonthlyFinancialReportDocument(MonthlyFinancialReport report)
    {
        _report = report;
    }

    static MonthlyFinancialReportDocument()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public DocumentSettings GetSettings() => DocumentSettings.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(style => style.FontSize(9).FontColor("1F2937"));
            page.Header().Element(ComposeHeader);
            page.Content().PaddingVertical(16).Column(column =>
            {
                column.Spacing(18);
                column.Item().Element(ComposeFinancialSummary);
                column.Item().Element(ComposeIncome);
                column.Item().Element(ComposeExpenses);
            });
            page.Footer().AlignCenter().Text(text =>
            {
                text.Span("InEx monthly financial report - page ").FontColor(MutedColor);
                text.CurrentPageNumber().FontColor(MutedColor);
                text.Span(" of ").FontColor(MutedColor);
                text.TotalPages().FontColor(MutedColor);
            });
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(column =>
            {
                column.Item().Text("InEx").FontSize(20).Bold().FontColor(HeaderColor);
                column.Item().Text("Monthly financial report").FontSize(14).SemiBold();
                column.Item().Text(new DateTime(_report.Year, _report.Month, 1).ToString("MMMM yyyy", CultureInfo.InvariantCulture)).FontColor(MutedColor);
            });
            row.ConstantItem(125).AlignRight().Column(column =>
            {
                column.Item().Text("Reporting currency").FontColor(MutedColor);
                column.Item().Text(_report.Currency).SemiBold();
            });
        });
    }

    private void ComposeFinancialSummary(IContainer container)
    {
        Section(container, "Financial summary", content =>
        {
            content.Column(column =>
            {
                column.Item().Row(row =>
                {
                    SummaryMetric(row.RelativeItem(), "Total income", _report.TotalIncome, PositiveColor);
                    SummaryMetric(row.RelativeItem(), "Total expenses", _report.TotalExpenses, NegativeColor);
                    SummaryMetric(row.RelativeItem(), "Surplus / deficit", _report.SurplusOrDeficit, _report.SurplusOrDeficit >= 0 ? PositiveColor : NegativeColor);
                });
                column.Item().PaddingTop(10).Row(row =>
                {
                    SummaryMetric(row.RelativeItem(), "Opening balance", _report.OpeningBalance, "1F2937");
                    SummaryMetric(row.RelativeItem(), "Closing balance", _report.ClosingBalance, "1F2937");
                    string spentIncome = _report.SpentIncomePercentage is decimal percentage
                        ? $"{percentage:N1}%"
                        : "Unavailable";
                    SummaryMetric(row.RelativeItem(), "Income spent", spentIncome, "1F2937");
                });
            });
        });
    }

    private void ComposeIncome(IContainer container)
    {
        ComposeCategorySummary(container, "Income", _report.TotalIncome, _report.IncomeCategories, "income");
    }

    private void ComposeExpenses(IContainer container)
    {
        ComposeCategorySummary(container, "Expenses", _report.TotalExpenses, _report.ExpenseCategories, "expense");
    }

    private void ComposeCategorySummary(
        IContainer container,
        string sectionTitle,
        decimal total,
        IReadOnlyList<MonthlyReportCategory> categories,
        string direction)
    {
        Section(container, sectionTitle, content =>
        {
            content.Column(column =>
            {
                column.Item().Text($"Total {direction}: {FormatAmount(total)}").SemiBold();
                if (categories.Count == 0)
                {
                    column.Item().PaddingTop(4).Text($"No {direction} categories for this month.").FontColor(MutedColor);
                    return;
                }

                column.Item().PaddingTop(8).Text($"{sectionTitle} distribution").SemiBold();
                foreach (var category in categories)
                {
                    decimal share = total == 0 ? 0 : category.Amount / total;
                    column.Item().PaddingTop(6).Row(row =>
                    {
                        row.RelativeItem(2).PaddingRight(8).Text(category.Name);
                        row.RelativeItem().PaddingTop(3).Height(10).Background("DBEAFE").Row(bar =>
                        {
                            bar.RelativeItem((float)Math.Max((double)share, 0.01)).Background(AccentColor);
                            if (share < 1)
                            {
                                bar.RelativeItem((float)(1 - share));
                            }
                        });
                        row.ConstantItem(120).AlignRight().Text($"{FormatAmount(category.Amount)} ({share:P1})");
                    });
                }

                column.Item().PaddingTop(10).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn();
                        columns.ConstantColumn(120);
                        columns.ConstantColumn(70);
                    });
                    TableHeader(table, "Category", "Amount", "Share");
                    foreach (var category in categories)
                    {
                        decimal share = total == 0 ? 0 : category.Amount / total;
                        TableCell(table.Cell(), category.Name);
                        TableCell(table.Cell().AlignRight(), FormatAmount(category.Amount));
                        TableCell(table.Cell().AlignRight(), share.ToString("P1", CultureInfo.InvariantCulture));
                    }
                    TableCell(table.Cell().Background("F3F4F6"), $"Total {direction}", true);
                    TableCell(table.Cell().Background("F3F4F6").AlignRight(), FormatAmount(total), true);
                    TableCell(table.Cell().Background("F3F4F6").AlignRight(), "100.0%", true);
                });
            });
        });
    }

    private static void Section(IContainer container, string title, Action<IContainer> composeContent)
    {
        container.Border(1).BorderColor(BorderColor).Padding(12).Column(column =>
        {
            column.Item().Text(title).FontSize(12).SemiBold().FontColor(HeaderColor);
            column.Item().PaddingTop(8).Element(composeContent);
        });
    }

    private static void SummaryMetric(IContainer container, string label, decimal value, string color) =>
        SummaryMetric(container, label, FormatNumber(value), color);

    private static void SummaryMetric(IContainer container, string label, string value, string color) =>
        container.Border(1).BorderColor(BorderColor).Padding(8).Column(column =>
        {
            column.Item().Text(label).FontSize(8).FontColor(MutedColor);
            column.Item().PaddingTop(3).Text(value).SemiBold().FontColor(color);
        });

    private static void TableHeader(TableDescriptor table, params string[] values)
    {
        table.Header(header =>
        {
            foreach (string value in values)
            {
                TableCell(header.Cell().Background("F3F4F6"), value, true);
            }
        });
    }

    private static void TableCell(IContainer container, string value, bool bold = false)
    {
        var text = container.BorderBottom(1).BorderColor(BorderColor).PaddingVertical(5).PaddingHorizontal(4).Text(value);
        if (bold)
        {
            text.SemiBold();
        }
    }

    private string FormatAmount(decimal amount) => $"{FormatNumber(amount)} {_report.Currency}";

    private static string FormatNumber(decimal value) => value.ToString("N2", CultureInfo.InvariantCulture);

    private readonly MonthlyFinancialReport _report;
}
