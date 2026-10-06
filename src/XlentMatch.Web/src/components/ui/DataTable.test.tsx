import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";

vi.mock("../../i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
afterEach(() => cleanup());

describe("DataTable clickable rows", () => {
  const columns = [{ key: "name", header: "Name", render: (row: { name: string }) => <><span>{row.name}</span><button type="button">Action</button></> }];
  const rows = [{ id: "1", name: "Anna" }];

  it("handles mouse and keyboard row navigation", () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} onRowClick={onRowClick} />);
    const row = screen.getByRole("link");
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    expect(onRowClick).toHaveBeenCalledTimes(3);
  });

  it("does not navigate when an interactive child is clicked", () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Action" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
