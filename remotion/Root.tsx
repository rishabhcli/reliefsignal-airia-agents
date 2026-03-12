import {Composition} from "remotion";
import {ReliefSignalDemo, TOTAL_FRAMES} from "./ReliefSignalDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReliefSignalDemo"
        component={ReliefSignalDemo}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
