import { deepStrictEqual as equal, ok } from "assert";
import {
    DeclarationReflection,
    LiteralType,
    ProjectReflection,
    ReflectionKind,
    Comment,
    CommentDisplayPart,
    CommentTag,
} from "../lib/models";
import type { TestLogger } from "./TestLogger";

function query(project: ProjectReflection, name: string) {
    const reflection = project.getChildByName(name);
    ok(reflection instanceof DeclarationReflection, `Failed to find ${name}`);
    return reflection;
}

export const behaviorTests: Record<
    string,
    (project: ProjectReflection, logger: TestLogger) => void
> = {
    asConstEnum(project) {
        const SomeEnumLike = query(project, "SomeEnumLike");
        equal(SomeEnumLike.kind, ReflectionKind.Variable, "SomeEnumLike");
        const SomeEnumLikeTagged = query(project, "SomeEnumLikeTagged");
        equal(
            SomeEnumLikeTagged.kind,
            ReflectionKind.Enum,
            "SomeEnumLikeTagged"
        );
        const A = query(project, "SomeEnumLikeTagged.a");
        equal(A.type, new LiteralType("a"));
        equal(A.defaultValue, undefined);

        const ManualEnum = query(project, "ManualEnum");
        equal(ManualEnum.kind, ReflectionKind.Enum, "ManualEnum");

        const ManualWithoutHelper = query(project, "ManualEnumHelper");
        equal(
            ManualWithoutHelper.kind,
            ReflectionKind.Enum,
            "ManualEnumHelper"
        );

        const WithoutReadonly = query(project, "WithoutReadonly");
        equal(WithoutReadonly.kind, ReflectionKind.Enum, "WithoutReadonly");

        const SomeEnumLikeNumeric = query(project, "SomeEnumLikeNumeric");
        equal(
            SomeEnumLikeNumeric.kind,
            ReflectionKind.Variable,
            "SomeEnumLikeNumeric"
        );
        const SomeEnumLikeTaggedNumeric = query(
            project,
            "SomeEnumLikeTaggedNumeric"
        );
        equal(
            SomeEnumLikeTaggedNumeric.kind,
            ReflectionKind.Enum,
            "SomeEnumLikeTaggedNumeric"
        );
        const B = query(project, "SomeEnumLikeTaggedNumeric.b");
        equal(B.type, new LiteralType(1));
        equal(B.defaultValue, undefined);

        const ManualEnumNumeric = query(project, "ManualEnumNumeric");
        equal(ManualEnumNumeric.kind, ReflectionKind.Enum, "ManualEnumNumeric");

        const ManualWithoutHelperNumeric = query(
            project,
            "ManualEnumHelperNumeric"
        );
        equal(
            ManualWithoutHelperNumeric.kind,
            ReflectionKind.Enum,
            "ManualEnumHelperNumeric"
        );

        const WithoutReadonlyNumeric = query(project, "WithoutReadonlyNumeric");
        equal(
            WithoutReadonlyNumeric.kind,
            ReflectionKind.Enum,
            "WithoutReadonlyNumeric"
        );
    },

    deprecatedBracketLinks(project, logger) {
        const a = query(project, "alpha");
        const b = query(project, "beta");

        const aTag = a.comment?.summary.find((p) => p.kind === "inline-tag") as
            | Extract<CommentDisplayPart, { kind: "inline-tag" }>
            | undefined;
        equal(aTag?.tag, "@link");
        equal(aTag?.text, "beta");
        equal(aTag.target, b);
        logger.expectMessage(
            "warn: alpha: Comment [[target]] style links are deprecated and will be removed in 0.24"
        );

        const bTag = b.comment?.summary.find((p) => p.kind === "inline-tag") as
            | Extract<CommentDisplayPart, { kind: "inline-tag" }>
            | undefined;
        equal(bTag?.tag, "@link");
        equal(bTag?.text, "bracket links");
        equal(bTag.target, a);
        logger.expectMessage(
            "warn: beta: Comment [[target]] style links are deprecated and will be removed in 0.24"
        );
    },

    duplicateHeritageClauses(project) {
        const b = query(project, "B");
        equal(b.extendedTypes?.map(String), ["A"]);

        const c = query(project, "C");
        equal(c.extendedTypes?.map(String), ["A"]);
        equal(c.implementedTypes?.map(String), ["A"]);

        const d = query(project, "D");
        equal(d.extendedTypes?.map(String), [
            'Record<"a", 1>',
            'Record<"b", 1>',
        ]);
    },

    exampleTags(project) {
        const foo = query(project, "foo");
        const tags = foo.comment?.blockTags.map((tag) => tag.content);

        equal(tags, [
            [{ kind: "code", text: "```ts\n// JSDoc style\ncodeHere();\n```" }],
            [
                { kind: "text", text: "JSDoc specialness\n" },
                {
                    kind: "code",
                    text: "```ts\n// JSDoc style\ncodeHere();\n```",
                },
            ],
            [{ kind: "code", text: "```ts\n// TSDoc style\ncodeHere();\n```" }],
        ]);
    },

    exportComments(project) {
        const abc = query(project, "abc");
        equal(abc.kind, ReflectionKind.Variable);
        equal(Comment.combineDisplayParts(abc.comment?.summary), "abc");

        const abcRef = query(project, "abcRef");
        equal(abcRef.kind, ReflectionKind.Reference);
        equal(
            Comment.combineDisplayParts(abcRef.comment?.summary),
            "export abc"
        );

        const foo = query(project, "foo");
        equal(Comment.combineDisplayParts(foo.comment?.summary), "export foo");
    },

    groupTag(project) {
        const A = query(project, "A");
        const B = query(project, "B");
        const C = query(project, "C");

        equal(
            project.groups?.map((g) => g.title),
            ["A", "B", "With Spaces"]
        );

        equal(
            project.groups.map((g) => g.children),
            [[A, B], [B], [C]]
        );
    },

    inheritDocBasic(project) {
        const target = query(project, "InterfaceTarget");
        const comment = new Comment(
            [{ kind: "text", text: "Summary" }],
            [new CommentTag("@remarks", [{ kind: "text", text: "Remarks" }])]
        );
        equal(target.comment, comment);

        equal(
            Comment.combineDisplayParts(
                target.typeParameters?.[0].comment?.summary
            ),
            "Type parameter"
        );

        const prop = query(project, "InterfaceTarget.property");
        equal(
            Comment.combineDisplayParts(prop.comment?.summary),
            "Property description"
        );

        const meth = query(project, "InterfaceTarget.someMethod");
        const methodComment = new Comment(
            [{ kind: "text", text: "Method description" }],
            [
                new CommentTag("@example", [
                    { kind: "text", text: "This should still be present\n" },
                    { kind: "code", text: "```ts\nsomeMethod(123)\n```" },
                ]),
            ]
        );
        equal(meth.signatures?.[0].comment, methodComment);
    },

    inheritDocJsdoc(project) {
        const fooComment = query(project, "Foo").comment;
        const fooMemberComment = query(project, "Foo.member").signatures?.[0]
            .comment;
        const xComment = query(project, "Foo.member").signatures?.[0]
            .parameters?.[0].comment;

        ok(fooComment, "Foo");
        ok(fooMemberComment, "Foo.member");
        ok(xComment, "Foo.member.x");

        for (const name of ["Bar", "Baz"]) {
            equal(query(project, name).comment, fooComment, name);
        }

        for (const name of ["Bar.member", "Baz.member"]) {
            const refl = query(project, name);
            equal(refl.signatures?.length, 1, name);

            equal(
                refl.signatures[0].comment,
                fooMemberComment,
                `${name} signature`
            );
            equal(
                refl.signatures[0].parameters?.[0].comment,
                xComment,
                `${name} parameter`
            );
        }
    },

    inheritDocRecursive(project, logger) {
        const a = query(project, "A");
        equal(a.comment?.getTag("@inheritDoc")?.name, "B");

        const b = query(project, "B");
        equal(b.comment?.getTag("@inheritDoc")?.name, "C");

        const c = query(project, "C");
        equal(c.comment?.getTag("@inheritDoc")?.name, "A");

        logger.expectMessage(
            "warn: @inheritDoc specifies a circular inheritance chain: B -> C -> A -> B"
        );
    },

    inheritDocWarnings(project, logger) {
        const target1 = query(project, "target1");
        equal(Comment.combineDisplayParts(target1.comment?.summary), "Source");
        equal(
            Comment.combineDisplayParts(
                target1.comment?.getTag("@remarks")?.content
            ),
            "Remarks"
        );
        logger.expectMessage(
            "warn: Content in the summary section will be overwritten by the @inheritDoc tag in comment at ./src/test/converter2/behavior/inheritDocWarnings.ts:9."
        );

        const target2 = query(project, "target2");
        equal(Comment.combineDisplayParts(target2.comment?.summary), "Source");
        equal(
            Comment.combineDisplayParts(
                target2.comment?.getTag("@remarks")?.content
            ),
            "Remarks"
        );
        logger.expectMessage(
            "warn: Content in the @remarks block will be overwritten by the @inheritDoc tag in comment at ./src/test/converter2/behavior/inheritDocWarnings.ts:15."
        );

        const target3 = query(project, "target3");
        ok(target3.comment?.getTag("@inheritDoc"));
        logger.expectMessage(
            'warn: Failed to find "doesNotExist" to inherit the comment from in the comment for target3'
        );

        const target4 = query(project, "target4");
        ok(target4.comment?.getTag("@inheritDoc"));
        logger.expectMessage(
            "warn: target4 tried to copy a comment from source2 with @inheritDoc, but the source has no associated comment."
        );
    },

    mergedDeclarations(project, logger) {
        const a = query(project, "SingleCommentMultiDeclaration");
        equal(
            Comment.combineDisplayParts(a.comment?.summary),
            "Comment on second declaration"
        );

        const b = query(project, "MultiCommentMultiDeclaration");
        equal(Comment.combineDisplayParts(b.comment?.summary), "Comment 1");

        logger.expectMessage(
            "warn: MultiCommentMultiDeclaration has multiple declarations with a comment. An arbitrary comment will be used."
        );
    },

    overloads(project) {
        const foo = query(project, "foo");
        const fooComments = foo.signatures?.map((sig) =>
            Comment.combineDisplayParts(sig.comment?.summary)
        );
        equal(fooComments, [
            "No arg comment\n",
            "{@inheritDoc (foo:NO_ARGS)}\n",
        ]);
        equal(foo.comment, undefined);

        equal(
            foo.signatures?.map((s) => s.label),
            ["NO_ARGS", "WITH_X"]
        );

        const bar = query(project, "bar");
        const barComments = bar.signatures?.map((sig) =>
            Comment.combineDisplayParts(sig.comment?.summary)
        );
        equal(barComments, ["Implementation comment", "Custom comment"]);
        equal(bar.comment, undefined);
    },

    readonlyTag(project) {
        const title = query(project, "Book.title");
        const author = query(project, "Book.author");

        ok(!title.setSignature);
        ok(author.flags.isReadonly);
    },

    removeReflection(project) {
        const foo = query(project, "foo");
        project.removeReflection(foo);
        equal(
            Object.values(project.reflections).map((r) => r.name),
            ["typedoc"]
        );
    },

    seeTags(project) {
        const foo = query(project, "foo");
        equal(
            Comment.combineDisplayParts(foo.comment?.getTag("@see")?.content),
            " - Double tag\n - Second tag\n"
        );

        const bar = query(project, "bar");
        equal(
            Comment.combineDisplayParts(bar.comment?.getTag("@see")?.content),
            "Single tag"
        );
    },
};
