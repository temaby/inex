import { describe, expect, it } from "vitest";
import { commentToken, replaceCommentToken } from "./comment-autocomplete";

describe("comment marker tokens", () => {
    it("recognizes literal-space-delimited markers at the caret and preserves punctuation and Cyrillic", () => {
        expect(commentToken("#", 1)).toMatchObject({ type: "tag", query: "", start: 0, end: 1 });
        expect(commentToken("Dinner @Ма, later", 10)).toMatchObject({ type: "ref", query: "ма", start: 7, end: 11 });
        expect(commentToken("\t#food\t", 6)).toMatchObject({ start: 1, end: 6, query: "food" });
        expect(commentToken("#food\t@ma", 9)).toMatchObject({ type: "tag", query: "food\t@ma" });
    });
    it("ignores emails, embedded markers, selection ranges and carets before a marker", () => {
        expect(commentToken("mail@example.com", 8)).toBeUndefined();
        expect(commentToken("word#tag", 8)).toBeUndefined();
        expect(commentToken("#tag", 0)).toBeUndefined();
        expect(commentToken("#tag", 2, 4)).toBeUndefined();
    });
    it("replaces the whole active token and retains text on both sides", () => {
        const value = "Dinner @mary yesterday #food";
        const token = commentToken(value, 10);
        expect(token).toBeDefined();
        expect(token && replaceCommentToken(value, token, "mark")).toEqual({ value: "Dinner @mark yesterday #food", caret: 12 });
    });
});
